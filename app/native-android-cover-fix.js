(() => {
  // Installed mode must mirror the cover selected in the shared HAKI admin panel.
  function applyCover() {
    const config = window.HAKI_CONFIG || {};
    const hero = document.getElementById('heroImage');
    if (!hero) return;
    if (window.HAKI_COVER_WAITING_LIVE) {
      hero.removeAttribute('src');
      hero.removeAttribute('srcset');
      hero.style.visibility = 'hidden';
      return;
    }
    const source = config.portadaOriginal || config.portadaDesktop || config.portada || config.portadaRespaldo;
    if (!source) return;

    const variants = [
      [config.portadaMobile,1080],
      [config.portadaTablet,1600],
      [config.portadaDesktop,2560],
      [config.portada,3200],
    ].filter(([url]) => String(url || '').trim());
    const unique = variants.filter(([url],index,list) =>
      list.findIndex(([candidate]) => candidate === url) === index
    );
    const target = config.portadaOriginal || config.portadaDesktop || (
      typeof window.hakiImage === 'function'
        ? window.hakiImage(source, matchMedia('(max-width:800px)').matches ? 1280 : 2560)
        : source
    );

    if (target && hero.getAttribute('src') !== target) hero.setAttribute('src', target);

    const responsive = unique.length > 1
      ? unique.map(([url,width]) => `${url} ${width}w`).join(', ')
      : '';
    const srcset = responsive || (
      typeof window.hakiSrcset === 'function'
        ? window.hakiSrcset(source)
        : ''
    );
    if (srcset) {
      hero.setAttribute('srcset', srcset);
      hero.setAttribute('sizes', '100vw');
    } else {
      hero.removeAttribute('srcset');
      hero.removeAttribute('sizes');
    }

    hero.fetchPriority = 'high';
    hero.decoding = 'async';
    hero.style.visibility = '';
  }

  applyCover();
  addEventListener('load', applyCover);
  addEventListener('pageshow', applyCover);
  addEventListener('haki:catalog-updated', applyCover);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) applyCover();
  });
})();
