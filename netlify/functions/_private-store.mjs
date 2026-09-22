import { getStore } from '@netlify/blobs';

const STORE_NAME = 'haki-private-sales';
const TABLE = 'haki_store';

function blobs() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function config() {
  const url = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return { url, key, enabled: Boolean(url && key) };
}

export function storageBackend() {
  return config().enabled ? 'supabase' : 'netlify-blobs';
}

async function readBlob(key) {
  return await blobs().get(key, { type: 'json', consistency: 'strong' });
}

async function supabaseRequest(method, query = {}, body) {
  const cfg = config();
  if (!cfg.enabled) throw new Error('Supabase no está configurado.');
  const url = new URL(`${cfg.url}/rest/v1/${TABLE}`);
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) url.searchParams.set(name, String(value));
  }
  const headers = {
    apikey: cfg.key,
    authorization: `Bearer ${cfg.key}`,
    'content-type': 'application/json',
    accept: 'application/json',
  };
  if (method === 'POST' || method === 'PATCH') headers.prefer = 'return=representation';
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { response, data };
}

async function readRemote(key) {
  const { response, data } = await supabaseRequest('GET', {
    select: 'value,updated_at',
    key: `eq.${key}`,
    limit: 1,
  });
  if (!response.ok) throw new Error(data?.message || data?.error || `Supabase respondió ${response.status}`);
  const row = Array.isArray(data) ? data[0] : null;
  return row ? { value: row.value, token: row.updated_at } : null;
}

async function insertRemote(key, value) {
  const updatedAt = new Date().toISOString();
  const { response, data } = await supabaseRequest('POST', {}, { key, value, updated_at: updatedAt });
  if (response.status === 409) return null;
  if (!response.ok) throw new Error(data?.message || data?.error || `Supabase respondió ${response.status}`);
  const row = Array.isArray(data) ? data[0] : null;
  return row ? { value: row.value, token: row.updated_at } : { value, token: updatedAt };
}

async function compareAndSetRemote(key, expectedToken, value) {
  const updatedAt = new Date().toISOString();
  const { response, data } = await supabaseRequest('PATCH', {
    key: `eq.${key}`,
    updated_at: `eq.${expectedToken}`,
  }, { value, updated_at: updatedAt });
  if (!response.ok) throw new Error(data?.message || data?.error || `Supabase respondió ${response.status}`);
  const row = Array.isArray(data) ? data[0] : null;
  return row ? { value: row.value, token: row.updated_at } : null;
}

async function seedRemote(key, fallback) {
  let current = await readRemote(key);
  if (current) return current;
  const legacy = await readBlob(key);
  const initial = legacy === null || legacy === undefined ? clone(fallback) : legacy;
  await insertRemote(key, initial);
  current = await readRemote(key);
  if (!current) throw new Error('No se pudo inicializar el almacenamiento de Supabase.');
  return current;
}

export async function readJSON(key, fallback) {
  if (!config().enabled) {
    const value = await readBlob(key);
    return value === null || value === undefined ? clone(fallback) : value;
  }

  const remote = await readRemote(key);
  if (remote) return remote.value;

  const legacy = await readBlob(key);
  if (legacy === null || legacy === undefined) return clone(fallback);

  await insertRemote(key, legacy);
  const migrated = await readRemote(key);
  return migrated ? migrated.value : legacy;
}

export async function mutateJSON(key, fallback, mutator) {
  if (!config().enabled) {
    const store = blobs();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const entry = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
      const current = entry?.data ?? clone(fallback);
      const next = await mutator(clone(current));
      const result = await store.setJSON(
        key,
        next,
        entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true }
      );
      if (result.modified) return next;
    }
    throw new Error('Los datos cambiaron al mismo tiempo. Intenta de nuevo.');
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await seedRemote(key, fallback);
    const next = await mutator(clone(current.value));
    const saved = await compareAndSetRemote(key, current.token, next);
    if (saved) return next;
  }
  throw new Error('Los datos cambiaron al mismo tiempo. Intenta de nuevo.');
}
