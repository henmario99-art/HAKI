/* One preference for the catalogue and every administrator screen. */
(() => {
  const key = 'haki_theme_v1';
  const root = document.documentElement;
  const valid = value => value === 'oscuro' || value === 'claro';
  const saved = () => { try { return localStorage.getItem(key); } catch { return null; } };
  function set(theme, persist = true) {
    const next = theme === 'oscuro' ? 'oscuro' : 'claro';
    if (persist) { try { localStorage.setItem(key, next); } catch {} }
    root.dataset.theme = next;
    if (window.HAKI_CONFIG) window.HAKI_CONFIG.tema = next;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = next === 'oscuro' ? '#15171c' : '#f5f5f3';
    document.querySelectorAll('[data-system-theme-toggle]').forEach(button => {
      const dark = next === 'oscuro';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      const label = button.querySelector('[data-theme-label]');
      if (label) label.textContent = dark ? 'Modo claro' : 'Modo oscuro';
    });
    window.dispatchEvent(new CustomEvent('haki-theme-changed', {detail: next}));
    return next;
  }
  window.HAKITheme = {
    set,
    current: () => root.dataset.theme === 'oscuro' ? 'oscuro' : 'claro',
    configure: fallback => set(valid(saved()) ? saved() : fallback, false),
    toggle: () => set(root.dataset.theme === 'oscuro' ? 'claro' : 'oscuro')
  };
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) window.HAKITheme.configure(window.HAKI_CONFIG?.tema || 'claro');
  });
  window.addEventListener('pageshow', () => window.HAKITheme.configure(root.dataset.theme || 'claro'));
  window.HAKITheme.configure('claro');
})();
