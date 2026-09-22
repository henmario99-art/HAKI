import { json, bodyJson, verifyAdmin, github, repoParts, BRANCH, sanitizeFileName } from './_shared.mjs';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export default async (request) => {
  if (!verifyAdmin(request)) return json({ error: 'No autorizado.' }, 401);
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  try {
    const body = await bodyJson(request);
    const mime = String(body?.mime || '');
    const base64 = String(body?.base64 || '');
    if (!ALLOWED.has(mime)) return json({ error: 'Formato de imagen no permitido.' }, 400);
    if (!base64) return json({ error: 'No se recibió la imagen.' }, 400);

    const approxBytes = Math.floor(base64.length * 0.75);
    if (approxBytes > 8 * 1024 * 1024) return json({ error: 'La imagen supera 8 MB.' }, 413);

    let name = sanitizeFileName(body?.name || `imagen-${Date.now()}.webp`);
    if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(name)) {
      const ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : mime === 'image/gif' ? '.gif' : '.jpg';
      name += ext;
    }

    // Unique names allow browser caching while replacements appear immediately.
    name = `${Date.now()}-${crypto.randomUUID().slice(0,8)}-${name}`;
    const path = `images/uploads/${name}`;
    const { owner, repo } = repoParts();
    let sha;
    try {
      const existing = await github(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(BRANCH)}`, { method: 'GET' });
      sha = existing.sha;
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    const payload = {
      message: `Subir imagen ${name} desde panel HAKI`,
      content: base64,
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    };

    const result = await github(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    const publicPath = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(BRANCH)}/${path.split('/').map(encodeURIComponent).join('/')}`;
    return json({ ok: true, path: publicPath, repoPath: path, commit: result?.commit?.sha || null });
  } catch (error) {
    console.error(error);
    return json({ error: error.message || 'No se pudo subir la imagen.' }, error.status || 500);
  }
};
