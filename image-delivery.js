/* Public catalogue images: originals stay in Storage; Netlify serves cached copies. */
(() => {
  const origin = 'https://uysfqzlihiosebqzvfrl.supabase.co';
  const prefix = '/storage/v1/object/public/haki-public/';
  const filePattern = /^catalog\/[a-z0-9][a-z0-9._-]{0,239}\.(?:jpe?g|png|webp|gif|avif)$/i;
  const widths = [400, 800, 1200];

  function objectPath(value) {
    try {
      const url = new URL(String(value || ''), location.href);
      if (url.origin !== origin || url.username || url.password || !url.pathname.startsWith(prefix)) return '';
      const path = decodeURIComponent(url.pathname.slice(prefix.length));
      return filePattern.test(path) ? path : '';
    } catch { return ''; }
  }

  function original(value = '') {
    const path = objectPath(value);
    // Uploads use a new timestamp/UUID key, so catalogue revisions need not bust image caches.
    return path ? '/.netlify/functions/catalog-image?path=' + encodeURIComponent(path) : String(value || '');
  }

  function resized(value, width) {
    return '/.netlify/images?url=' + encodeURIComponent(original(value)) + '&w=' + width + '&q=90';
  }

  function image(value = '', size = 800) {
    const path = objectPath(value);
    if (!path) return String(value || '');
    // Keep original pixels for product detail/zoom and animated GIFs.
    if (Number(size) >= 1400 || /\.gif$/i.test(path)) return original(value);
    const width = widths.find(width => width >= (Number(size) || 800)) || widths.at(-1);
    return resized(value, width);
  }

  function srcset(value = '') {
    const path = objectPath(value);
    return path && !/\.gif$/i.test(path)
      ? widths.map(width => resized(value, width) + ' ' + width + 'w').join(', ')
      : '';
  }

  window.HAKI_MEDIA = { original, image, srcset, isCatalogImage: value => !!objectPath(value) };
})();
