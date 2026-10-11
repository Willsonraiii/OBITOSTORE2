import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MEMBERS_FILE = path.join(ROOT, 'members.json');

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

/**
 * Read the current members store, creating the default file if not found.
 */
export async function getMembersStore() {
  try {
    const raw = await readFile(MEMBERS_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.referrals)) data.referrals = [];
    if (!Array.isArray(data.clients)) data.clients = [];
    return data;
  } catch {
    await saveMembersStore(DEFAULT_STORE);
    return JSON.parse(JSON.stringify(DEFAULT_STORE));
  }
}

/**
 * Persist the members store safely to disk.
 */
export async function saveMembersStore(data) {
  try {
    await writeFile(MEMBERS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[members-store] failed to save:', err);
  }
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
