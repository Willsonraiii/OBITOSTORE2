/**
 * Per-Obito-user TikTok account store.
 *
 * One record per "subject" ("owner" or a members-store clientId):
 *   { open_id, username, display_name, avatar_url, scope,
 *     access_token, refresh_token, expires_at, refresh_expires_at, connected_at }
 *
 * - Lives in DATA_DIR/tiktok-accounts.json (same DATA_DIR as members-store.js).
 * - Tokens are encrypted at rest with AES-256-GCM when TIKTOK_TOKEN_KEY (64 hex chars) is set:
 *     openssl rand -hex 32
 *   Without it they are stored in plain text (a startup warning is logged).
 * - All read-modify-write cycles run INSIDE the lock (unlike members-store, see review §2).
 * - Access tokens expire after 24 h; getValidAccessToken() refreshes them 5 min early and
 *   persists the (possibly rotated) refresh token.
 * - Cloud copy: the container disk is wiped on every redeploy, so (like members-store) the file is
 *   mirrored into the private GitHub Gist (MEMBERS_GIST_ID / MEMBERS_GIST_TOKEN, overridable with
 *   TIKTOK_GIST_ID / TIKTOK_GIST_TOKEN) as "tiktok-accounts.json" and restored on boot when the
 *   local file is missing. Only ENCRYPTED records are mirrored — without TIKTOK_TOKEN_KEY the
 *   mirror stays off.
 */
import { readFile, writeFile, mkdir, rename, chmod } from 'node:fs/promises';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import path from 'node:path';
import { refreshAccessToken } from './lib/tiktok-api.js';

const PERSISTENT_DIR = process.env.DATA_DIR || path.join(process.env.HOME || '/tmp', '.obito-studio-data');
const FILE = path.join(PERSISTENT_DIR, 'tiktok-accounts.json');
const KEY = /^[0-9a-f]{64}$/i.test(process.env.TIKTOK_TOKEN_KEY || '') ? Buffer.from(process.env.TIKTOK_TOKEN_KEY, 'hex') : null;
if (!KEY) console.warn('[tiktok-store] TIKTOK_TOKEN_KEY not set — TikTok tokens will be stored unencrypted');

// ---- Gist mirror (survives redeploys) ----------------------------------------
const GIST_ID = process.env.TIKTOK_GIST_ID || process.env.MEMBERS_GIST_ID || '';
const GIST_TOKEN = process.env.TIKTOK_GIST_TOKEN || process.env.MEMBERS_GIST_TOKEN || '';
const GIST_FILE = 'tiktok-accounts.json';
const GIST_SYNC = Boolean(GIST_ID && GIST_TOKEN && KEY);
if (GIST_ID && GIST_TOKEN && !KEY) console.warn('[tiktok-store] Gist mirror OFF: set TIKTOK_TOKEN_KEY so only encrypted tokens leave this machine');
if (!GIST_ID || !GIST_TOKEN) console.warn('[tiktok-store] no Gist configured — TikTok connections will be lost on every redeploy (set MEMBERS_GIST_ID/MEMBERS_GIST_TOKEN or mount a volume at DATA_DIR)');
const gistHeaders = { 'User-Agent': 'ObitoStudio', Authorization: `token ${GIST_TOKEN}`, Accept: 'application/vnd.github+json' };

async function gistFetch() {
  try {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers: gistHeaders, signal: AbortSignal.timeout(6000) });
    if (!res.ok) { console.warn(`[tiktok-store] Gist fetch HTTP ${res.status}`); return null; }
    const file = (await res.json())?.files?.[GIST_FILE];
    if (!file) return null;
    let content = file.content;
    if (file.truncated && file.raw_url) content = await (await fetch(file.raw_url, { headers: gistHeaders, signal: AbortSignal.timeout(6000) })).text();
    const data = JSON.parse(content || '{}');
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch (e) { console.warn('[tiktok-store] Gist fetch error (non-fatal):', e.message); return null; }
}

async function gistPush(data) {
  try {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH', headers: { ...gistHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(data, null, 2) } } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.warn(`[tiktok-store] Gist sync HTTP ${res.status}`);
  } catch (e) { console.warn('[tiktok-store] Gist sync error (non-fatal):', e.message); }
}

// ---- crypto -----------------------------------------------------------------
function seal(plain) {
  if (!KEY || plain == null) return plain;
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return `enc1:${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${ct.toString('base64')}`;
}
function unseal(v) {
  if (typeof v !== 'string' || !v.startsWith('enc1:')) return v;
  if (!KEY) throw new Error('tiktok-store: encrypted token but TIKTOK_TOKEN_KEY is missing');
  const [, iv, tag, ct] = v.split(':');
  const d = createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
}
const SECRET_FIELDS = ['access_token', 'refresh_token'];
const sealRec = (r) => ({ ...r, ...Object.fromEntries(SECRET_FIELDS.map((k) => [k, seal(r[k])])) });
const unsealRec = (r) => ({ ...r, ...Object.fromEntries(SECRET_FIELDS.map((k) => [k, unseal(r[k])])) });

// ---- persistence (single in-process lock around every read-modify-write) -----
let lock = Promise.resolve();
function withLock(fn) {
  const run = lock.then(fn, fn);
  lock = run.catch(() => {});
  return run;
}
let cache = null;
async function load() {
  if (cache) return cache;
  let local = null;
  try { local = JSON.parse(await readFile(FILE, 'utf8')); } catch { /* first boot or wiped disk */ }
  if (local && Object.keys(local).length) { cache = local; return cache; }
  if (GIST_SYNC) {
    const remote = await gistFetch();
    if (remote && Object.keys(remote).length) {
      console.log(`[tiktok-store] restored ${Object.keys(remote).length} TikTok connection(s) from Gist`);
      cache = remote;
      await writeLocal(remote).catch((e) => console.warn('[tiktok-store] local write failed:', e.message));
      return cache;
    }
  }
  cache = local || {};
  return cache;
}
async function writeLocal(data) {
  await mkdir(PERSISTENT_DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  await rename(tmp, FILE);
  await chmod(FILE, 0o600).catch(() => {});
}
async function persist(data) {
  await writeLocal(data);
  cache = data;
  if (GIST_SYNC) await gistPush(data); // awaited so a redeploy right after connect can't lose it
}

// ---- public API ---------------------------------------------------------------
/** Decrypted record or null. */
export function getAccount(subject) {
  return withLock(async () => {
    const rec = (await load())[subject];
    return rec ? unsealRec(rec) : null;
  });
}

/** Store tokens from an OAuth response + profile. */
export function saveAccount(subject, { tokens, profile }) {
  return withLock(async () => {
    const data = await load();
    const now = Date.now();
    const rec = {
      open_id: tokens.open_id,
      scope: tokens.scope,
      username: profile?.username || null,
      display_name: profile?.display_name || null,
      avatar_url: profile?.avatar_url || null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: now + Number(tokens.expires_in || 86400) * 1000,
      refresh_expires_at: now + Number(tokens.refresh_expires_in || 31536000) * 1000,
      connected_at: data[subject]?.connected_at || now,
    };
    data[subject] = sealRec(rec);
    await persist(data);
    return rec;
  });
}

export function deleteAccount(subject) {
  return withLock(async () => {
    const data = await load();
    const existed = Boolean(data[subject]);
    delete data[subject];
    await persist(data);
    return existed;
  });
}

/** Non-secret view for the UI. */
export async function publicAccount(subject) {
  const a = await getAccount(subject);
  if (!a) return null;
  const scopes = String(a.scope || '').split(',').map((s) => s.trim()).filter(Boolean);
  return { open_id: a.open_id, username: a.username, display_name: a.display_name, avatar_url: a.avatar_url, scopes, connected_at: a.connected_at, refresh_expires_at: a.refresh_expires_at };
}

/**
 * Returns a usable access token, refreshing (and persisting) when it expires within 5 minutes.
 * Throws { code: 'not_connected' } / { code: 'reconnect_required' } for the route layer to map.
 */
export function getValidAccessToken(subject, { clientKey, clientSecret }) {
  return withLock(async () => {
    const data = await load();
    const rec = data[subject] ? unsealRec(data[subject]) : null;
    if (!rec) throw Object.assign(new Error('TikTok account not connected'), { code: 'not_connected' });
    if (Date.now() < rec.expires_at - 5 * 60 * 1000) return rec.access_token;
    if (Date.now() > rec.refresh_expires_at) throw Object.assign(new Error('TikTok refresh token expired — reconnect'), { code: 'reconnect_required' });
    let t;
    try {
      t = await refreshAccessToken({ clientKey, clientSecret, refreshToken: rec.refresh_token });
    } catch (e) {
      throw Object.assign(new Error('TikTok token refresh failed — reconnect (' + (e.message || e.code) + ')'), { code: 'reconnect_required' });
    }
    const now = Date.now();
    const next = {
      ...rec,
      access_token: t.access_token,
      refresh_token: t.refresh_token || rec.refresh_token,   // may rotate
      expires_at: now + Number(t.expires_in || 86400) * 1000,
      refresh_expires_at: t.refresh_expires_in ? now + Number(t.refresh_expires_in) * 1000 : rec.refresh_expires_at,
      scope: t.scope || rec.scope,
    };
    data[subject] = sealRec(next);
    await persist(data);
    return next.access_token;
  });
}
