(() => {
  function setup() {
    const hero = document.getElementById('homeHero');
    if (!hero || hero.querySelector('.mobile-drop-cta')) return;
    hero.classList.add('mobile-drop-hero');
    const cta = document.createElement('a');
    cta.className = 'mobile-drop-cta';
    cta.href = '#nuevo-drop';
    const label = document.createElement('span');
    label.className = 'mobile-drop-cta-label';
    label.textContent = 'Comprar';
    cta.append(label);
    const scroll = document.createElement('button');
    scroll.className = 'mobile-hero-scroll';
    scroll.type = 'button';
    scroll.setAttribute('aria-label', 'Seguir explorando el catálogo');
    scroll.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 9 7 7 7-7"/></svg>';
    scroll.addEventListener('click', () => {
      const next = ['novedades','collectionsSection','catalogo'].map(id => document.getElementById(id))
        .find(element => element && element.getClientRects().length);
      const masthead = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--haki-mobile-masthead')) ||
        (document.querySelector('.header')?.getBoundingClientRect().height || 0);
      const top = (next || hero).getBoundingClientRect().top + window.scrollY - masthead;
      window.scrollTo({top:Math.max(0, top), behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    });
    hero.append(cta, scroll);
    const image = document.getElementById('heroImage');
    function fitArtwork() {
      if (!matchMedia('(max-width:800px)').matches || !image?.naturalWidth || !image.naturalHeight) return;
      hero.style.setProperty('--mobile-drop-aspect', `${image.naturalWidth}/${image.naturalHeight}`);
    }
    image?.addEventListener('load', fitArtwork);
    fitArtwork();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, {once:true});
  else setup();
})();
