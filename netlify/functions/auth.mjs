import { json, bodyJson, makeSession, makeOperationsToken, verifySignedToken, sessionCookie, clearSessionCookie, safeEqualText, verifyAdmin } from './_shared.mjs';

export default async (request) => {
  if (request.method === 'GET') {
    const authenticated = verifyAdmin(request);
    const secret = process.env.ADMIN_SESSION_SECRET || '';
    return json({
      authenticated,
      operationsToken: authenticated && secret ? makeOperationsToken(secret) : '',
    });
  }

  if (request.method === 'POST') {
    const body = await bodyJson(request);
    const secret = process.env.ADMIN_SESSION_SECRET || '';

    if (body?.action === 'verifyOperations') {
      const payload = verifySignedToken(body?.token || '', secret, 'operations');
      return json({
        valid: !!payload,
        expiresAt: payload ? new Date(Number(payload.exp)).toISOString() : null,
      }, payload ? 200 : 401);
    }

    const password = body?.password || '';
    const expected = process.env.ADMIN_PASSWORD || '';

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
