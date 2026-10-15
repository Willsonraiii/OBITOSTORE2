/**
 * "Post to TikTok" routes for server-rtx-online.js
 *
 *   GET  /api/tiktok/config              public  -> { enabled, directPost, inboxUpload, audited }
 *   GET  /api/tiktok/connect             auth    -> { url }   (browser then navigates/popups to it)
 *   GET  /api/tiktok/callback            PUBLIC  TikTok redirects here with ?code&state (no Obito token!)
 *   GET  /api/tiktok/me                  auth    -> { connected, account, creator }  (calls creator_info/query)
 *   POST /api/tiktok/disconnect          auth    -> { ok }
 *   POST /api/jobs/:id/tiktok            auth    -> { publishId }   starts upload in the background
 *   GET  /api/jobs/:id/tiktok            auth    -> { state, uploaded, total, status, failReason, postIds }
 *
 * Wire-up in server-rtx-online.js:
 *   1. exempt '/tiktok/callback' and '/tiktok/config' in the /api guard
 *   2. mountTikTokRoutes(app, { jobs, validJobId })
 *
 * Env:
 *   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET   from the TikTok developer portal
 *   TIKTOK_REDIRECT_URI                        must EXACTLY match the portal (https://host/api/tiktok/callback)
 *   TIKTOK_SCOPES                              default user.info.basic,video.upload,video.publish
 *   TIKTOK_AUDITED                             "true" once TikTok approved the Content Posting API audit
 *   TIKTOK_STATE_SECRET                        random string (HMAC for the OAuth state); random per boot if unset
 *   TIKTOK_TOKEN_KEY                           64 hex chars; encrypts stored tokens (tiktok-store.js)
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import {
  buildAuthorizeUrl, exchangeCode, revokeToken, getUserInfo, queryCreatorInfo,
  chunkPlan, initDirectPost, initInboxUpload, uploadFileChunked, fetchPublishStatus,
  PRIVACY_LEVELS, TikTokApiError, describeError,
} from './lib/tiktok-api.js';
import { getAccount, saveAccount, deleteAccount, publicAccount, getValidAccessToken } from './tiktok-store.js';

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || '';
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || '';
const SCOPES = (process.env.TIKTOK_SCOPES || 'user.info.basic,video.upload,video.publish').split(',').map((s) => s.trim()).filter(Boolean);
const AUDITED = /^(1|true|yes)$/i.test(process.env.TIKTOK_AUDITED || '');
const FORCE_CONSENT = /^(1|true|yes)$/i.test(process.env.TIKTOK_FORCE_CONSENT || ''); // adds disable_auto_auth=1 (see buildAuthorizeUrl)
const STATE_SECRET = process.env.TIKTOK_STATE_SECRET || randomBytes(32).toString('hex');
const ENABLED = Boolean(CLIENT_KEY && CLIENT_SECRET && REDIRECT_URI);
const DIRECT = SCOPES.includes('video.publish');
const INBOX = SCOPES.includes('video.upload');
const STATUS_POLL_MIN_MS = 3000;          // TikTok: 30 status fetches / min / token
const MUSIC_URL = 'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en';
const BC_URL = 'https://www.tiktok.com/legal/page/global/bc-policy/en';

// ---- OAuth state: HMAC-signed { sub, nonce, exp }, single use -------------------------------
const usedNonces = new Map(); // nonce -> exp
const b64u = (b) => Buffer.from(b).toString('base64url');
function signState(sub) {
  const payload = b64u(JSON.stringify({ sub, nonce: randomBytes(12).toString('hex'), exp: Date.now() + 10 * 60 * 1000 }));
  const mac = createHmac('sha256', STATE_SECRET).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}
function verifyState(state) {
  const [payload, mac] = String(state || '').split('.');
  if (!payload || !mac) return null;
  const expect = createHmac('sha256', STATE_SECRET).update(payload).digest('base64url');
  if (expect.length !== mac.length || !timingSafeEqual(Buffer.from(expect), Buffer.from(mac))) return null;
  let obj;
  try { obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
  if (!obj?.sub || !obj.nonce || Date.now() > obj.exp || usedNonces.has(obj.nonce)) return null;
  usedNonces.set(obj.nonce, obj.exp);
  return obj;
}
setInterval(() => { const now = Date.now(); for (const [n, exp] of usedNonces) if (exp < now) usedNonces.delete(n); }, 60_000).unref();

/** Which Obito identity is calling — set by the /api guard in server-rtx-online.js. */
function subjectOf(req) {
  if (req.isOwner) return 'owner';
  if (req.client?.clientId) return `client:${req.client.clientId}`;
  return 'anonymous'; // open/dev mode only
}

function probeDurationSec(file) {
  return new Promise((resolve) => {
    execFile('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { timeout: 10000 }, (err, out) => {
      resolve(err ? null : Number(String(out).trim()) || null);
    });
  });
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function sendApiError(res, err, fallbackStatus = 502) {
  if (err instanceof TikTokApiError) {
    const status = err.httpStatus === 401 ? 401 : err.httpStatus === 429 ? 429 : err.httpStatus >= 400 && err.httpStatus < 500 ? 400 : fallbackStatus;
    return res.status(status).json({ error: describeError(err), code: err.code, logId: err.logId });
  }
  if (err?.code === 'not_connected') return res.status(409).json({ error: 'Connect your TikTok account first.', code: 'not_connected' });
  if (err?.code === 'reconnect_required') return res.status(409).json({ error: err.message, code: 'reconnect_required' });
  console.error('[tiktok]', err);
  return res.status(500).json({ error: 'TikTok request failed.' });
}

export function mountTikTokRoutes(app, { jobs, validJobId }) {
  if (!ENABLED) console.warn('[tiktok] disabled — set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET and TIKTOK_REDIRECT_URI to enable "Post to TikTok"');
  else console.log(`[tiktok] enabled · scopes ${SCOPES.join(',')} · audited=${AUDITED} · redirect ${REDIRECT_URI}`);

  // Public: lets the frontend decide whether to render the button at all.
  app.get('/api/tiktok/config', (_req, res) => {
    res.json({ enabled: ENABLED, directPost: ENABLED && DIRECT, inboxUpload: ENABLED && INBOX, audited: AUDITED });
  });

  // Step 1 — frontend fetch()es this with its Obito token, then opens the returned URL.
  app.get('/api/tiktok/connect', (req, res) => {
    if (!ENABLED) return res.status(503).json({ error: 'TikTok posting is not configured on this server.' });
    const url = buildAuthorizeUrl({ clientKey: CLIENT_KEY, redirectUri: REDIRECT_URI, scopes: SCOPES, state: signState(subjectOf(req)), forceConsent: FORCE_CONSENT });
    res.json({ url });
  });

  // Step 2 — TikTok sends the browser back here. No Obito token on this request; identity comes from the signed state.
  app.get('/api/tiktok/callback', wrap(async (req, res) => {
    const done = (q) => res.redirect(302, '/tiktok-connected.html?' + new URLSearchParams(q).toString());
    if (req.query.error) return done({ ok: '0', reason: String(req.query.error_description || req.query.error).slice(0, 200) });
    const st = verifyState(req.query.state);
    if (!st) return done({ ok: '0', reason: 'Invalid or expired sign-in state. Try again.' });
    if (!req.query.code) return done({ ok: '0', reason: 'TikTok did not return an authorization code.' });
    try {
      const tokens = await exchangeCode({ clientKey: CLIENT_KEY, clientSecret: CLIENT_SECRET, code: String(req.query.code), redirectUri: REDIRECT_URI });
      let profile = null;
      try { profile = await getUserInfo(tokens.access_token); } catch { /* user.info.basic missing — not fatal */ }
      await saveAccount(st.sub, { tokens, profile });
      console.log(`[tiktok] ${st.sub} connected as @${profile?.username || tokens.open_id} (scope ${tokens.scope})`);
      return done({ ok: '1', user: profile?.display_name || profile?.username || '' });
    } catch (e) {
      console.error('[tiktok] callback failed:', e.code || e.message);
      return done({ ok: '0', reason: describeError(e) });
    }
  }));

  // Connection + creator info. TikTok requires creator_info to be queried when the post UI is shown.
  app.get('/api/tiktok/me', wrap(async (req, res) => {
    if (!ENABLED) return res.json({ enabled: false, connected: false });
    const sub = subjectOf(req);
    const account = await publicAccount(sub);
    if (!account) return res.json({ enabled: true, connected: false });
    let creator = null, creatorError = null;
    try {
      const token = await getValidAccessToken(sub, { clientKey: CLIENT_KEY, clientSecret: CLIENT_SECRET });
      creator = await queryCreatorInfo(token);
    } catch (e) {
      creatorError = { code: e.code || 'error', message: describeError(e) };
      if (e.code === 'reconnect_required' || e.code === 'access_token_invalid' || e.httpStatus === 401) {
        return res.json({ enabled: true, connected: false, reconnect: true, error: creatorError });
      }
    }
    res.json({
      enabled: true, connected: true, audited: AUDITED, account, creator, creatorError,
      consent: { musicUrl: MUSIC_URL, brandedContentUrl: BC_URL },
      modes: { direct: DIRECT && account.scopes.includes('video.publish'), inbox: INBOX && account.scopes.includes('video.upload') },
    });
  }));

  // Disconnect = forget our copy AND revoke the grant at TikTok (awaited, ~1 s). Revoking is what makes
  // TikTok show its consent page again on the next "Continue with TikTok" instead of silently re-using
  // the old grant. A stale (expired) access token can't be revoked, so refresh it first when possible.
  app.post('/api/tiktok/disconnect', wrap(async (req, res) => {
    const sub = subjectOf(req);
    const acc = await getAccount(sub);
    let revoked = false;
    if (acc) {
      let token = acc.access_token;
      try { token = await getValidAccessToken(sub, { clientKey: CLIENT_KEY, clientSecret: CLIENT_SECRET }); } catch { /* use stored token */ }
      try { revoked = await revokeToken({ clientKey: CLIENT_KEY, clientSecret: CLIENT_SECRET, token }); } catch (e) { console.warn('[tiktok] revoke failed:', e.message || e); }
    }
    await deleteAccount(sub);
    res.json({ ok: true, revoked });
  }));

  // Start a post. Validates everything TikTok's UX guidelines require, then uploads in the background.
  app.post('/api/jobs/:id/tiktok', wrap(async (req, res) => {
    if (!ENABLED) return res.status(503).json({ error: 'TikTok posting is not configured on this server.' });
    if (!validJobId(req.params.id)) return res.status(400).json({ error: 'Bad job id.' });
    const job = jobs.get(req.params.id);
    if (!job || job.status !== 'done' || !existsSync(job.outputPath)) return res.status(404).json({ error: 'Optimized video is no longer available.' });
    if (job.tiktok && ['uploading', 'processing'].includes(job.tiktok.state)) return res.status(409).json({ error: 'This video is already being posted to TikTok.' });

    const sub = subjectOf(req);
    const b = req.body || {};
    const mode = b.mode === 'inbox' ? 'inbox' : 'direct';
    if (mode === 'direct' && !DIRECT) return res.status(400).json({ error: 'Direct Post is not enabled on this server (needs scope video.publish).' });
    if (mode === 'inbox' && !INBOX) return res.status(400).json({ error: 'Upload to TikTok drafts is not enabled on this server (needs scope video.upload).' });
    if (b.consent !== true) return res.status(400).json({ error: 'You must accept TikTok\'s Music Usage Confirmation before posting.' });

    // Token + fresh creator info (privacy options / interaction flags / max duration are per-account).
    let token, creator;
    try {
      token = await getValidAccessToken(sub, { clientKey: CLIENT_KEY, clientSecret: CLIENT_SECRET });
      creator = await queryCreatorInfo(token);
    } catch (e) { return sendApiError(res, e); }

    const videoSize = (await stat(job.outputPath)).size;
    const durationSec = await probeDurationSec(job.outputPath);
    if (creator.max_video_post_duration_sec && durationSec && durationSec > creator.max_video_post_duration_sec) {
      return res.status(400).json({ error: `This video is ${Math.round(durationSec)} s long; TikTok allows up to ${creator.max_video_post_duration_sec} s for this account. (Obito's timing method doubles the clip's runtime — use a shorter source.)`, code: 'duration_check_failed' });
    }

    let postInfo = null;
    if (mode === 'direct') {
      const privacy = String(b.privacy_level || '');
      const allowed = Array.isArray(creator.privacy_level_options) && creator.privacy_level_options.length ? creator.privacy_level_options : PRIVACY_LEVELS;
      if (!allowed.includes(privacy)) return res.status(400).json({ error: 'Choose a privacy option (no default is allowed by TikTok).', code: 'privacy_level_option_mismatch' });
      if (!AUDITED && privacy !== 'SELF_ONLY') return res.status(400).json({ error: describeError({ code: 'unaudited_client_can_only_post_to_private_accounts' }), code: 'unaudited_client_can_only_post_to_private_accounts' });

      const title = String(b.title || '').slice(0, 2200);
      const commercial = b.commercial && typeof b.commercial === 'object' ? b.commercial : { enabled: false };
      if (commercial.enabled && !commercial.your_brand && !commercial.branded_content) {
        return res.status(400).json({ error: 'Commercial content is on — choose "Your brand" and/or "Branded content".' });
      }
      if (commercial.enabled && commercial.branded_content && privacy === 'SELF_ONLY') {
        return res.status(400).json({ error: 'Branded content cannot be posted as "Only me". Choose a different privacy option.' });
      }
      postInfo = {
        title,
        privacy_level: privacy,
        // Interaction toggles are OFF by default in the UI; "allow_*" true => disable_* false.
        disable_comment: !(b.allow_comment === true) || Boolean(creator.comment_disabled),
        disable_duet: !(b.allow_duet === true) || Boolean(creator.duet_disabled),
        disable_stitch: !(b.allow_stitch === true) || Boolean(creator.stitch_disabled),
        video_cover_timestamp_ms: Number.isInteger(b.cover_ms) && b.cover_ms >= 0 ? b.cover_ms : 1000,
        brand_content_toggle: Boolean(commercial.enabled && commercial.branded_content),
        brand_organic_toggle: Boolean(commercial.enabled && commercial.your_brand),
        is_aigc: b.is_aigc === true,
      };
    }

    const plan = chunkPlan(videoSize);
    let init;
    try {
      init = mode === 'direct'
        ? await initDirectPost(token, { postInfo, videoSize, plan })
        : await initInboxUpload(token, { videoSize, plan });
    } catch (e) { return sendApiError(res, e); }

    job.tiktok = {
      mode, publishId: init.publish_id, state: 'uploading', uploaded: 0, total: videoSize,
      status: null, failReason: null, postIds: [], error: null, startedAt: Date.now(), lastPoll: 0, sub,
    };
    console.log(`[tiktok] job ${job.id} -> ${mode} publish ${init.publish_id} (${videoSize} bytes, ${plan.totalChunkCount} chunk(s))`);
    res.status(202).json({ publishId: init.publish_id, mode, chunks: plan.totalChunkCount });

    // Background upload — the client polls GET /api/jobs/:id/tiktok.
    uploadFileChunked({
      uploadUrl: init.upload_url, filePath: job.outputPath, videoSize, plan,
      onProgress: ({ uploaded }) => { job.tiktok.uploaded = uploaded; },
    }).then(() => {
      job.tiktok.state = 'processing';
      job.tiktok.uploaded = videoSize;
      console.log(`[tiktok] job ${job.id} upload complete — TikTok processing`);
    }).catch((e) => {
      job.tiktok.state = 'failed';
      job.tiktok.error = describeError(e);
      console.error(`[tiktok] job ${job.id} upload failed: ${e.code || ''} ${e.message}`);
    });
  }));

  // Progress + TikTok processing status (throttled to one status/fetch per 3 s per job).
  app.get('/api/jobs/:id/tiktok', wrap(async (req, res) => {
    if (!validJobId(req.params.id)) return res.status(400).json({ error: 'Bad job id.' });
    const job = jobs.get(req.params.id);
    if (!job?.tiktok) return res.status(404).json({ error: 'No TikTok post for this job.' });
    const t = job.tiktok;
    if (t.state === 'processing' && Date.now() - t.lastPoll >= STATUS_POLL_MIN_MS) {
      t.lastPoll = Date.now();
      try {
        const token = await getValidAccessToken(t.sub, { clientKey: CLIENT_KEY, clientSecret: CLIENT_SECRET });
        const s = await fetchPublishStatus(token, t.publishId);
        t.status = s.status || null;
        t.failReason = s.fail_reason || null;
        t.postIds = Array.isArray(s.publicaly_available_post_id) ? s.publicaly_available_post_id : [];
        if (s.status === 'PUBLISH_COMPLETE' || s.status === 'SEND_TO_USER_INBOX') t.state = 'complete';
        else if (s.status === 'FAILED') { t.state = 'failed'; t.error = describeError({ code: s.fail_reason, message: s.fail_reason }); }
      } catch (e) {
        if (!(e instanceof TikTokApiError && e.retryable)) { t.state = 'failed'; t.error = describeError(e); }
      }
    }
    res.json({ mode: t.mode, publishId: t.publishId, state: t.state, uploaded: t.uploaded, total: t.total, status: t.status, failReason: t.failReason, postIds: t.postIds, error: t.error });
  }));
}
