/* HAKI v29: begin fetching only the current admin-selected cover as soon as productos.js executes. */
(() => {
  const hero = document.getElementById('heroImage');
  const config = window.HAKI_CONFIG || {};
  const source = config.portada || config.portadaRespaldo || '';
  if (!hero || !source) return;

  const raw = String(source);
  const remote = /^(?:https?:|data:|blob:)/i.test(raw);
  const clean = raw.replace(/^\/?(?:\.\/)?/, '');
  const src = remote
    ? raw
    : 'https://cdn.jsdelivr.net/gh/henmario99-art/HAKI@main/' + clean;

  hero.src = src;
  hero.fetchPriority = 'high';
  hero.decoding = 'async';
})();
