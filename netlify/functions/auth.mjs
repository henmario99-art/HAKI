import { json, bodyJson, makeSession, sessionCookie, clearSessionCookie, safeEqualText, verifyAdmin } from './_shared.mjs';

export default async (request) => {
  if (request.method === 'GET') {
    return json({ authenticated: verifyAdmin(request) });
  }

  if (request.method === 'POST') {
    const body = await bodyJson(request);
    const password = body?.password || '';
    const expected = process.env.ADMIN_PASSWORD || '';
    const secret = process.env.ADMIN_SESSION_SECRET || '';

    if (!expected || !secret) {
      return json({ error: 'El panel aún no está configurado en Netlify.' }, 503);
    }

    if (!safeEqualText(password, expected)) {
      return json({ error: 'Contraseña incorrecta.' }, 401);
    }

    const token = makeSession(secret);
    return json(
      { ok: true },
      200,
      { 'set-cookie': sessionCookie(token) }
    );
  }

  if (request.method === 'DELETE') {
    return json(
      { ok: true },
      200,
      { 'set-cookie': clearSessionCookie() }
    );
  }

  return json({ error: 'Método no permitido.' }, 405);
};
