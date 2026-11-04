import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createImageHandler } from '../netlify/functions/catalog-image.mjs';

const ORIGIN = 'https://uysfqzlihiosebqzvfrl.supabase.co';
const IMAGE = ORIGIN + '/storage/v1/object/public/haki-public/catalog/1793397107690-5a20a008-photo.webp';
const source = readFileSync(new URL('../image-delivery.js', import.meta.url), 'utf8');
function media() {
  const window = {};
  vm.runInNewContext(source, { window, URL, location: { href: 'https://haki-sv.netlify.app/app/' } });
  return window.HAKI_MEDIA;
}
const request = (path, method = 'GET', headers = {}) => new Request('https://haki-sv.netlify.app/.netlify/functions/catalog-image?path=' + encodeURIComponent(path), { method, headers });

test('Public image identities remain stable across catalogue/cover revisions', () => {
  const m = media();
  assert.equal(m.original(IMAGE + '?v=first'), m.original(IMAGE + '?v=second'));
  assert.equal(new URL(m.original(IMAGE), 'https://haki-sv.netlify.app').searchParams.get('path'), 'catalog/1793397107690-5a20a008-photo.webp');
  assert.notEqual(m.original(IMAGE), m.original(IMAGE.replace('photo.webp', 'replacement.webp')));
});

test('Thumbnails share the cached original and detail/cover keep original pixels', () => {
  const m = media(), thumbnail = new URL(m.image(IMAGE, 560), 'https://haki-sv.netlify.app');
  assert.equal(thumbnail.pathname, '/.netlify/images');
  assert.equal(thumbnail.searchParams.get('w'), '800');
  assert.equal(thumbnail.searchParams.get('url'), m.original(IMAGE));
  assert.equal(m.image(IMAGE, 1400), m.original(IMAGE));
  assert.equal(m.image(IMAGE, 4096), m.original(IMAGE));
  assert.match(m.srcset(IMAGE), /400w, .*800w, .*1200w$/);
});

test('Local images, video, SVG, private URLs and unrelated sites retain their URLs', () => {
  const m = media();
  for (const value of ['images/photo.webp', '/images/logo.svg', 'data:image/png;base64,AA==', 'blob:https://haki-sv.netlify.app/one', 'https://example.com/photo.webp', ORIGIN + '/storage/v1/object/sign/haki-public/catalog/photo.webp?token=private', ORIGIN + '/storage/v1/object/public/haki-public/catalog/movie.mp4', IMAGE.replace('supabase.co', 'supabase.co.example.com')]) {
    assert.equal(m.original(value), value);
    assert.equal(m.image(value, 400), value);
    assert.equal(m.srcset(value), '');
  }
  const gif = IMAGE.replace('.webp', '.gif');
  assert.equal(m.image(gif, 400), m.original(gif));
  assert.equal(m.srcset(gif), '');
});

test('Image URL mapping rejects credentials, encoded traversal and malformed escapes', () => {
  const m = media();
  for (const value of [IMAGE.replace('https://', 'https://user:password@'), IMAGE.replace('photo.webp', '%2f..%2fphoto.webp'), IMAGE.replace('photo.webp', '%25ZZ.webp'), IMAGE.replace('catalog/', 'other/')]) {
    assert.equal(m.isCatalogImage(value), false);
    assert.equal(m.original(value), value);
  }
});

test('The server rejects open proxies, private paths and traversal without fetching', async () => {
  let calls = 0;
  const handler = createImageHandler(async () => { calls++; throw Error('should not fetch'); });
  for (const path of ['', 'https://example.com/photo.webp', '../photo.webp', 'catalog/../../photo.webp', 'catalog/%2e%2e%2fphoto.webp', 'other/photo.webp', 'catalog/photo.html', 'catalog/photo.webp?token=secret', 'catalog/a\\photo.webp']) {
    const response = await handler(request(path));
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(calls, 0);
});

test('Successful copies preserve bytes and set browser/durable CDN caching', async () => {
  const bytes = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4]);
  let received;
  const handler = createImageHandler(async (url, options) => {
    received = { url, options };
    return new Response(bytes, { headers: { 'content-type': 'image/webp', 'cache-control': 'no-cache', etag: '"original"' } });
  });
  const response = await handler(request('catalog/photo.webp', 'GET', { cookie: 'private', authorization: 'Bearer private' }));
  assert.equal(response.status, 200);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  assert.equal(received.url, ORIGIN + '/storage/v1/object/public/haki-public/catalog/photo.webp');
  assert.deepEqual(received.options.headers, { accept: 'image/*' });
  assert.equal(received.options.redirect, 'error');
  assert.match(response.headers.get('cache-control'), /max-age=31536000, immutable/);
  assert.match(response.headers.get('netlify-cdn-cache-control'), /durable/);
  assert.equal(response.headers.get('netlify-vary'), 'query=path');
  assert.equal(response.headers.get('etag'), '"original"');
});

test('Missing, failed or invalid upstream images are never cached', async () => {
  for (const upstream of [() => new Response('missing', { status: 404 }), () => new Response('quota', { status: 402 }), () => new Response('<html>error</html>', { headers: { 'content-type': 'text/html' } }), () => { throw Error('timeout'); }]) {
    const response = await createImageHandler(async () => upstream())(request('catalog/photo.webp'));
    assert.notEqual(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('netlify-cdn-cache-control'), 'no-store');
  }
});

test('HEAD is supported and writes are rejected', async () => {
  let method;
  const handler = createImageHandler(async (_url, options) => {
    method = options.method;
    return new Response(null, { headers: { 'content-type': 'image/jpeg' } });
  });
  const head = await handler(request('catalog/photo.jpg', 'HEAD'));
  assert.equal(method, 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const post = await handler(request('catalog/photo.jpg', 'POST'));
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
});

test('Both storefronts load image delivery before rendering and keep cover dimensions', () => {
  for (const page of ['index.html', 'app/index.html']) {
    const html = readFileSync(new URL('../' + page, import.meta.url), 'utf8');
    assert.ok(html.indexOf('/image-delivery.js?') < html.indexOf('app.js?'), page);
  }
  for (const path of ['app.js', 'app/app.js', 'cover-loader.js']) {
    assert.match(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), /HAKI_MEDIA\?\.original\(url.href\)/);
  }
});

test('The actual storefront script order preserves cached delivery after legacy helper overrides', () => {
  for (const order of [
    ['image-delivery.js','online-catalog.js','experience-config.js'],
    ['image-delivery.js','app/experience-config.js','app/catalog-loader.js','app/doufu-runtime.js'],
  ]) {
    const window={addEventListener(){}};
    const document={readyState:'loading',addEventListener(){},getElementById(){return null;},
      documentElement:{dataset:{},classList:{add(){}}},head:{append(){}},createElement(){return {};}};
    const context=vm.createContext({window,document,URL,location:{href:'https://haki-sv.netlify.app/',pathname:'/'},
      localStorage:{getItem(){return null;}},MutationObserver:class{observe(){}},Element:class{}});
    for(const file of order)vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
    assert.match(window.hakiImage(IMAGE,400), /^\/\.netlify\/images\?/,order.join(' -> '));
    assert.equal(window.hakiImage(IMAGE,1400),window.HAKI_MEDIA.original(IMAGE));
    assert.match(window.hakiSrcset(IMAGE),/400w/);
  }
});
