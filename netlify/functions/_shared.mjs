import crypto from 'node:crypto';

export const REPO = process.env.GITHUB_REPO || 'henmario99-art/HAKI';
export const BRANCH = process.env.GITHUB_BRANCH || 'main';
export const COOKIE_NAME = 'haki_admin';

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signPart(part, secret) {
  return crypto.createHmac('sha256', secret).update(part).digest('base64url');
}

function makeSignedToken(secret, role, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  const payload = {
    role,
    exp: Date.now() + maxAgeMs,
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${signPart(body, secret)}`;
}

export function makeSession(secret) {
  return makeSignedToken(secret, 'admin');
}

export function makeOperationsToken(secret) {
  return makeSignedToken(secret, 'operations');
}

export function verifySignedToken(token = '', secret = '', expectedRole = '') {
  if (!token || !secret || !token.includes('.')) return null;
  const [body, signature] = String(token).split('.');
  const expected = signPart(body, secret);
  const a = Buffer.from(signature || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (expectedRole && payload.role !== expectedRole) return null;
    if (Number(payload.exp) <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function getCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  const pairs = raw.split(';').map(v => v.trim());
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    if (pair.slice(0, idx) === name) return decodeURIComponent(pair.slice(idx + 1));
  }
  return '';
}

export function verifyAdmin(request) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const token = getCookie(request, COOKIE_NAME);
  if (!token || !token.includes('.')) return false;
  const [body, signature] = token.split('.');
  const expected = signPart(body, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return payload.role === 'admin' && Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function safeEqualText(a = '', b = '') {
  const ah = crypto.createHash('sha256').update(String(a)).digest();
  const bh = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ah, bh);
}

export function repoParts() {
  const [owner, repo] = REPO.split('/');
  if (!owner || !repo) throw new Error('GITHUB_REPO debe tener formato owner/repo');
  return { owner, repo };
}

export async function github(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Falta GITHUB_TOKEN en Netlify');

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) return null;
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }

  if (!response.ok) {
    const error = new Error(data?.message || `GitHub respondió ${response.status}`);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

export async function bodyJson(request) {
  try { return await request.json(); } catch { return null; }
}

export function sanitizeFileName(name = '') {
  const cleaned = String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 100);
  return cleaned || `imagen-${Date.now()}.webp`;
}
