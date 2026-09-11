import { json, bodyJson, verifyAdmin, github, repoParts, BRANCH } from './_shared.mjs';

function parseCatalog(source) {
  const configStart = source.indexOf('window.HAKI_CONFIG =');
  const productsStart = source.indexOf('window.HAKI_PRODUCTOS =');
  if (configStart < 0 || productsStart < 0) throw new Error('No se reconoce el formato de productos.js');

  const configEq = source.indexOf('=', configStart) + 1;
  const configEnd = source.indexOf(';', configEq);
  const productsEq = source.indexOf('=', productsStart) + 1;
  const productsEnd = source.indexOf(';', productsEq);

  const config = JSON.parse(source.slice(configEq, configEnd).trim());
  const products = JSON.parse(source.slice(productsEq, productsEnd).trim());
  return { config, products };
}

function serializeCatalog(config, products) {
  return `// ============================================================\n// HAKI — ARCHIVO PRINCIPAL PARA EDITAR EL CATÁLOGO\n// Gestionado desde /admin/\n// true = disponible | false = agotada\n// ============================================================\n\nwindow.HAKI_CONFIG = ${JSON.stringify(config, null, 2)};\n\nwindow.HAKI_PRODUCTOS = ${JSON.stringify(products, null, 2)};\n`;
}

function validatePayload(body) {
  if (!body || typeof body !== 'object') throw new Error('Datos inválidos.');
  if (!body.config || typeof body.config !== 'object') throw new Error('Falta la configuración.');
  if (!Array.isArray(body.products)) throw new Error('Falta la lista de productos.');

  const seen = new Set();
  for (const [index, p] of body.products.entries()) {
    if (!p || typeof p !== 'object') throw new Error(`Producto ${index + 1} inválido.`);
    p.id = Number(p.id || index + 1);
    p.codigo = String(p.codigo || '').trim();
    p.nombre = String(p.nombre || '').trim();
    p.categoria = String(p.categoria || '').trim();
    p.precio = Number(p.precio || 0);
    p.imagen = String(p.imagen || '').trim();
    p.imagenRespaldo = String(p.imagenRespaldo || 'images/producto.svg').trim();
    p.tallas = { S: !!p.tallas?.S, M: !!p.tallas?.M, L: !!p.tallas?.L, XL: !!p.tallas?.XL };

    if (!p.codigo) throw new Error(`El producto ${index + 1} no tiene código.`);
    if (!p.nombre) throw new Error(`El producto ${index + 1} no tiene nombre.`);
    if (!Number.isFinite(p.precio) || p.precio < 0) throw new Error(`Precio inválido en ${p.codigo}.`);
    if (seen.has(p.codigo)) throw new Error(`Código duplicado: ${p.codigo}`);
    seen.add(p.codigo);
  }
}

export default async (request) => {
  if (!verifyAdmin(request)) return json({ error: 'No autorizado.' }, 401);

  const { owner, repo } = repoParts();
  const path = `/repos/${owner}/${repo}/contents/productos.js?ref=${encodeURIComponent(BRANCH)}`;

  try {
    if (request.method === 'GET') {
      const file = await github(path, { method: 'GET' });
      const source = Buffer.from(file.content, 'base64').toString('utf8');
      const parsed = parseCatalog(source);
      return json({ ...parsed, sha: file.sha, branch: BRANCH });
    }

    if (request.method === 'PUT') {
      const body = await bodyJson(request);
      validatePayload(body);

      const current = await github(path, { method: 'GET' });
      const content = serializeCatalog(body.config, body.products);
      const result = await github(`/repos/${owner}/${repo}/contents/productos.js`, {
        method: 'PUT',
        body: JSON.stringify({
          message: body.message || 'Actualizar catálogo desde panel HAKI',
          content: Buffer.from(content, 'utf8').toString('base64'),
          sha: current.sha,
          branch: BRANCH,
        }),
      });

      return json({ ok: true, commit: result?.commit?.sha || null });
    }

    return json({ error: 'Método no permitido.' }, 405);
  } catch (error) {
    console.error(error);
    return json({ error: error.message || 'Error del servidor.' }, error.status || 500);
  }
};
