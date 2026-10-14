import { readFile, writeFile, mkdir, rename, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PERSISTENT_DIR = process.env.DATA_DIR || path.join(process.env.HOME || '/home/willson', '.obito-studio-data');
const MEMBERS_FILE = path.join(PERSISTENT_DIR, 'members.json');
const BACKUP_FILE = path.join(PERSISTENT_DIR, 'members.backup.json');
const SNAPSHOTS_DIR = path.join(PERSISTENT_DIR, 'snapshots');
const LEGACY_FILE = path.join(ROOT, 'members.json');

const DEFAULT_STORE = {
  referrals: [
    {
      code: 'OBITO-VIP',
      maxUses: 10,
      usedCount: 0,
      status: 'active',
      note: 'Default starter referral code',
      createdAt: Date.now()
    }
  ],
  clients: []
};

// In-process lock queue to prevent race conditions during concurrent requests
let ioLock = Promise.resolve();
function withLock(fn) {
  const next = ioLock.then(fn, fn);
  ioLock = next.catch(() => {});
  return next;
}

/**
 * Read the current members store with zero-data-loss fallback.
 * Checks MEMBERS_FILE first, then BACKUP_FILE.
 * NEVER resets to default if an existing data file is present.
 */
export async function getMembersStore() {
  await mkdir(PERSISTENT_DIR, { recursive: true });
  await mkdir(SNAPSHOTS_DIR, { recursive: true });

  // 1. Try primary storage
  if (existsSync(MEMBERS_FILE)) {
    try {
      const raw = await readFile(MEMBERS_FILE, 'utf8');
      if (raw && raw.trim().length > 0) {
        const data = JSON.parse(raw);
        if (!Array.isArray(data.referrals)) data.referrals = [];
        if (!Array.isArray(data.clients)) data.clients = [];
        return data;
      }
    } catch (err) {
      console.error('[members-store] Failed to parse primary members.json, attempting backup recovery:', err);
    }
  }

  // 2. Try backup storage if primary was corrupt or unreadable
  if (existsSync(BACKUP_FILE)) {
    try {
      const backupRaw = await readFile(BACKUP_FILE, 'utf8');
      if (backupRaw && backupRaw.trim().length > 0) {
        const data = JSON.parse(backupRaw);
        if (!Array.isArray(data.referrals)) data.referrals = [];
        if (!Array.isArray(data.clients)) data.clients = [];
        // Restore primary from backup immediately
        await atomicWriteFile(MEMBERS_FILE, backupRaw);
        console.warn('[members-store] Successfully recovered members store from backup file.');
        return data;
      }
    } catch (err) {
      console.error('[members-store] Backup file also unreadable:', err);
    }
  }

  // 3. Check legacy file in repo root
  if (existsSync(LEGACY_FILE)) {
    try {
      const legacyRaw = await readFile(LEGACY_FILE, 'utf8');
      if (legacyRaw && legacyRaw.trim().length > 0) {
        const data = JSON.parse(legacyRaw);
        if (!Array.isArray(data.referrals)) data.referrals = [];
        if (!Array.isArray(data.clients)) data.clients = [];
        await saveMembersStore(data);
        return data;
      }
    } catch {
      /* ignore legacy parse error */
    }
  }

  // 4. Genuine first run initialization only
  const initial = JSON.parse(JSON.stringify(DEFAULT_STORE));
  await saveMembersStore(initial);
  return initial;
}

/**
 * Write a file atomically using a temporary file and rename.
 * Prevents race condition partial reads in Linux.
 */
async function atomicWriteFile(targetPath, content) {
  const dir = path.dirname(targetPath);
  const tempPath = path.join(dir, `.tmp_${path.basename(targetPath)}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  await writeFile(tempPath, content, 'utf8');
  await rename(tempPath, targetPath);
}

/**
 * Persist the members store safely to disk with atomic operations & rolling snapshots.
 */
export async function saveMembersStore(data) {
  return withLock(async () => {
    try {
      await mkdir(PERSISTENT_DIR, { recursive: true });
      await mkdir(SNAPSHOTS_DIR, { recursive: true });

      const serialized = JSON.stringify(data, null, 2);

      // Write atomically to primary
      await atomicWriteFile(MEMBERS_FILE, serialized);

      // Write atomically to secondary backup
      await atomicWriteFile(BACKUP_FILE, serialized);

      // Periodic rolling snapshot (keeps last 10 snapshots)
      const snapshotPath = path.join(SNAPSHOTS_DIR, `members_${Date.now()}.json`);
      await writeFile(snapshotPath, serialized, 'utf8').catch(() => {});
    } catch (err) {
      console.error('[members-store] CRITICAL failed to save members store:', err);
      throw err;
    }
  });
}

/**
 * Generate a friendly unique client ID: e.g. "cli_9f2b"
 */
export function generateClientId(prefix = 'client') {
  return `${prefix}_${randomBytes(3).toString('hex')}`;
}

/**
 * Generate a strong access code: e.g. "OBT-8A2F-9C1D"
 */
export function generateAccessCode() {
  const p1 = randomBytes(2).toString('hex').toUpperCase();
  const p2 = randomBytes(2).toString('hex').toUpperCase();
  return `OBT-${p1}-${p2}`;
}

/**
 * Validate a client login attempt against members.json.
 * Returns client object if valid and active, else null.
 */
export async function authenticateClient(clientId, accessCode) {
  if (!clientId || !accessCode) return null;
  const store = await getMembersStore();
  const normalizedId = clientId.trim().toLowerCase();
  const client = store.clients.find(
    (c) => c.clientId.toLowerCase() === normalizedId && c.accessCode === accessCode.trim()
  );
  if (!client) return null;
  if (client.status !== 'active') return null;
  if (client.expiresAt && Date.now() > client.expiresAt) return null;
  return client;
}

/**
 * Check if an accessCode is active for any registered client.
 */
export async function findActiveClientByCode(accessCode) {
  if (!accessCode) return null;
  const store = await getMembersStore();
  const token = accessCode.trim();
  return store.clients.find(
    (c) => c.accessCode === token && c.status === 'active' && (!c.expiresAt || Date.now() <= c.expiresAt)
  ) || null;
}

/**
 * Redeem a referral code to issue a new client pass.
 */
export async function redeemReferralCode(referralCode, clientName = '') {
  if (!referralCode) throw new Error('Referral code is required.');
  const normalized = referralCode.trim().toUpperCase();
  const store = await getMembersStore();
  
  const ref = store.referrals.find((r) => r.code.toUpperCase() === normalized);
  if (!ref) {
    throw new Error('Referral code is invalid or does not exist.');
  }
  if (ref.status !== 'active') {
    throw new Error('This referral code has been deactivated.');
  }
  if (ref.maxUses !== null && ref.maxUses !== undefined && ref.usedCount >= ref.maxUses) {
    throw new Error('This referral code has reached its maximum usage limit.');
  }

  // Create new client credentials
  const sanitizedName = clientName.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
  const clientId = generateClientId(sanitizedName || 'user');
  const accessCode = generateAccessCode();

  const newClient = {
    clientId,
    accessCode,
    name: clientName.trim() || 'Referral User',
    source: 'referral',
    referralCode: ref.code,
    status: 'active',
    createdAt: Date.now(),
    expiresAt: null
  };

  ref.usedCount = (ref.usedCount || 0) + 1;
  store.clients.unshift(newClient);

  await saveMembersStore(store);
  return {
    clientId: newClient.clientId,
    accessCode: newClient.accessCode,
    name: newClient.name,
    referralCode: ref.code
  };
}

/**
 * Admin: Add a new referral code.
 */
export async function createReferral({ code, maxUses = 1, note = '' }) {
  if (!code) throw new Error('Code is required');
  const normalized = code.trim().toUpperCase();
  const store = await getMembersStore();
  if (store.referrals.some((r) => r.code.toUpperCase() === normalized)) {
    throw new Error('A referral code with this name already exists.');
  }
  const parsedMax = maxUses === 'unlimited' || maxUses === null ? null : Math.max(1, parseInt(maxUses, 10) || 1);
  const newRef = {
    code: normalized,
    maxUses: parsedMax,
    usedCount: 0,
    status: 'active',
    note: note.trim(),
    createdAt: Date.now()
  };
  store.referrals.unshift(newRef);
  await saveMembersStore(store);
  return newRef;
}

/**
 * Admin: Toggle or remove referral.
 */
export async function toggleReferralStatus(code) {
  const store = await getMembersStore();
  const ref = store.referrals.find((r) => r.code.toUpperCase() === code.trim().toUpperCase());
  if (!ref) throw new Error('Referral code not found');
  ref.status = ref.status === 'active' ? 'disabled' : 'active';
  await saveMembersStore(store);
  return ref;
}

export async function deleteReferral(code) {
  const store = await getMembersStore();
  store.referrals = store.referrals.filter((r) => r.code.toUpperCase() !== code.trim().toUpperCase());
  await saveMembersStore(store);
  return true;
}

/**
 * Admin: Manually create a client ID and pass.
 */
export async function createClientManually({ name = '', customCode = '', customId = '' }) {
  const store = await getMembersStore();
  const clientId = customId ? customId.trim() : generateClientId('client');
  const accessCode = customCode ? customCode.trim() : generateAccessCode();
  
  if (store.clients.some((c) => c.clientId.toLowerCase() === clientId.toLowerCase())) {
    throw new Error('Client ID already exists.');
  }

  const client = {
    clientId,
    accessCode,
    name: name.trim() || 'Manual Client',
    source: 'manual',
    status: 'active',
    createdAt: Date.now(),
    expiresAt: null
  };
  store.clients.unshift(client);
  await saveMembersStore(store);
  return client;
}

/**
 * Admin: Revoke or toggle a client.
 */
export async function toggleClientStatus(clientId) {
  const store = await getMembersStore();
  const client = store.clients.find((c) => c.clientId.toLowerCase() === clientId.trim().toLowerCase());
  if (!client) throw new Error('Client not found');
  client.status = client.status === 'active' ? 'revoked' : 'active';
  await saveMembersStore(store);
  return client;
}

export async function deleteClient(clientId) {
  const store = await getMembersStore();
  store.clients = store.clients.filter((c) => c.clientId.toLowerCase() !== clientId.trim().toLowerCase());
  await saveMembersStore(store);
  return true;
}
