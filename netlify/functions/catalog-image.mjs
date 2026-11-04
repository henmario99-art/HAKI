// Fixed public bucket only: no credentials, arbitrary origins or private Storage paths.
const STORAGE = 'https://uysfqzlihiosebqzvfrl.supabase.co/storage/v1/object/public/haki-public/';
const FILE = /^catalog\/[a-z0-9][a-z0-9._-]{0,239}\.(?:jpe?g|png|webp|gif|avif)$/i;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

function unavailable(status, message = 'Image unavailable.') {
  return new Response(message, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'netlify-cdn-cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...(status === 405 ? { allow: 'GET, HEAD' } : {}),
    },
  });
}

export function createImageHandler(fetchImage = fetch) {
  return async request => {
    if (!['GET', 'HEAD'].includes(request.method)) return unavailable(405);
    const path = new URL(request.url).searchParams.get('path') || '';
    if (!FILE.test(path)) return unavailable(404);

    try {
      const url = STORAGE + path.split('/').map(encodeURIComponent).join('/');
      const upstream = await fetchImage(url, {
        method: request.method,
        headers: { accept: 'image/*' },
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
      if (!upstream.ok) return unavailable(upstream.status === 404 ? 404 : 502);
      const type = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!TYPES.has(type)) return unavailable(502);

      // HAKI uploads create immutable timestamp/UUID keys, never overwrite existing files.
      // This cache also protects the origin when Image CDN requests another thumbnail size.
      const headers = {
        'content-type': type,
        'cache-control': 'public, max-age=31536000, immutable',
        'netlify-cdn-cache-control': 'public, durable, max-age=31536000',
        'netlify-vary': 'query=path',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': 'noindex',
      };
      const etag = upstream.headers.get('etag');
      if (etag) headers.etag = etag;
      return new Response(request.method === 'HEAD' ? null : upstream.body, { headers });
    } catch {
      return unavailable(503);
    }
  };
}

export default createImageHandler();
