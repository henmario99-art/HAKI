(() => {
  // Installed mode must mirror the cover selected in the shared HAKI admin panel.
  function applyCover() {
    const config = window.HAKI_CONFIG || {};
    const hero = document.getElementById('heroImage');
    if (!hero) return;
    const source = config.portada || config.portadaRespaldo;
    if (!source) return;

    const target = typeof window.hakiImage === 'function'
      ? window.hakiImage(source, 1920)
      : source;

    if (target && hero.getAttribute('src') !== target) hero.setAttribute('src', target);

    const srcset = typeof window.hakiSrcset === 'function'
      ? window.hakiSrcset(source)
      : '';
    if (srcset) {
      hero.setAttribute('srcset', srcset);
      hero.setAttribute('sizes', '100vw');
    } else {
      hero.removeAttribute('srcset');
      hero.removeAttribute('sizes');
    }

    hero.fetchPriority = 'high';
    hero.decoding = 'async';
  }

  applyCover();
  addEventListener('load', applyCover);
  addEventListener('pageshow', applyCover);
  addEventListener('haki:catalog-updated', applyCover);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) applyCover();
  });
})();
