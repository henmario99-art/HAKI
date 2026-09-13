import { json, github, repoParts, BRANCH } from './_shared.mjs';

function parseCatalog(source) {
  const a = source.match(/window\.HAKI_CONFIG\s*=\s*(\{[\s\S]*?\});\s*window\.HAKI_PRODUCTOS/);
  const b = source.match(/window\.HAKI_PRODUCTOS\s*=\s*(\[[\s\S]*\]);\s*$/);
  if (!a || !b) throw new Error('No se reconoce el formato de productos.js');
  const config = JSON.parse(a[1]);
  const products = JSON.parse(b[1]);
  return { config, products };
}

export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Método no permitido.' }, 405);

  try {
    const { owner, repo } = repoParts();
    const file = await github(`/repos/${owner}/${repo}/contents/productos.js?ref=${encodeURIComponent(BRANCH)}`, { method: 'GET' });
    const source = Buffer.from(file.content, 'base64').toString('utf8');
    const parsed = parseCatalog(source);

    return json(
      { ...parsed, version: file.sha },
      200,
      {
        'cache-control': 'no-store, max-age=0',
        'x-haki-catalog-source': 'github-live'
      }
    );
  } catch (error) {
    console.error(error);
    return json({ error: 'No se pudo cargar el catálogo.' }, 500);
  }
};
