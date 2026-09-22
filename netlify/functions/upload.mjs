import { json, bodyJson, verifyAdmin, makeOperationsToken } from './_shared.mjs';

const EDGE = 'https://uysfqzlihiosebqzvfrl.supabase.co/functions/v1/haki-operations';
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','image/gif']);

export default async request => {
  if (!verifyAdmin(request)) return json({ error:'No autorizado.' },401);
  if (request.method !== 'POST') return json({ error:'Método no permitido.' },405);
  try {
    const body = await bodyJson(request);
    const mime = String(body?.mime || '');
    const base64 = String(body?.base64 || '');
    if (!ALLOWED.has(mime)) return json({ error:'Formato de imagen no permitido.' },400);
    if (!base64) return json({ error:'No se recibió la imagen.' },400);
    if (Math.floor(base64.length * 0.75) > 8 * 1024 * 1024) return json({ error:'La imagen supera 8 MB.' },413);

    const secret = process.env.ADMIN_SESSION_SECRET || '';
    if (!secret) throw new Error('El panel no tiene configurada la sesión administrativa.');
    const response = await fetch(`${EDGE}?mode=upload`, {
      method:'POST',
      headers:{
        'content-type':'application/json',
        'x-haki-operations-token':makeOperationsToken(secret),
      },
      body:JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return json({ error:data.error || 'No se pudo subir la imagen.' },response.status);
    return json({ ok:true, path:data.path, storagePath:data.storagePath, commit:null, storage:'supabase' });
  } catch(error) {
    console.error(error);
    return json({ error:error.message || 'No se pudo subir la imagen.' },error.status || 500);
  }
};
