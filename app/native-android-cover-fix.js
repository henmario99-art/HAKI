(() => {
  const COVER_REL = 'assets/portada-haki-v15.webp';
  const clean = value => String(value || '').replace(/^\/?(?:\.\/)?/, '').split('?')[0].split('#')[0];
  const isCover = value => clean(value) === COVER_REL;
  const localCover = () => new URL(COVER_REL, document.baseURI).href;

  const previousImage = window.hakiImage;
  const previousSrcset = window.hakiSrcset;
  window.hakiImage = (url = '', size = 800) => {
    if (isCover(url)) return localCover();
    return typeof previousImage === 'function' ? previousImage(url, size) : url;
  };
  window.hakiSrcset = url => {
    if (isCover(url)) return '';
    return typeof previousSrcset === 'function' ? previousSrcset(url) : '';
  };

  function applyCover() {
    if (window.HAKI_CONFIG) {
      window.HAKI_CONFIG.portada = COVER_REL;
      window.HAKI_CONFIG.portadaRespaldo = COVER_REL;
    }
    const hero = document.getElementById('heroImage');
    if (!hero) return;
    hero.removeAttribute('srcset');
    hero.removeAttribute('sizes');
    const target = localCover();
    if (hero.src !== target) hero.src = target;
    hero.fetchPriority = 'high';
    hero.decoding = 'sync';
  }

  applyCover();
  addEventListener('load', applyCover);
  addEventListener('pageshow', applyCover);
  addEventListener('haki:catalog-updated', applyCover);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) applyCover(); });
  setTimeout(applyCover, 0);
  setTimeout(applyCover, 250);
  setTimeout(applyCover, 1000);
})();
