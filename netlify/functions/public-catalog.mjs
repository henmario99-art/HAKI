import { json, github, repoParts, BRANCH } from './_shared.mjs';

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
