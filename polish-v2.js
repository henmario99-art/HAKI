(() => {
  const $ = (s, el = document) => el.querySelector(s);

  function revealGalleryDots() {
    const detail = $('#productDetail');
    if (!detail || detail.hidden) return;
    const media = $('.detail-media', detail);
    const gallery = $('#detailGallery', detail);
    if (!media || !gallery || gallery.dataset.hakiDotsReady) return;

    gallery.dataset.hakiDotsReady = '1';
    let timer;
    const reveal = () => {
      media.classList.add('gallery-dots-visible');
      clearTimeout(timer);
      timer = setTimeout(() => media.classList.remove('gallery-dots-visible'), 2400);
    };

    gallery.addEventListener('pointerdown', reveal, { passive: true });
    gallery.addEventListener('touchstart', reveal, { passive: true });
    gallery.addEventListener('scroll', reveal, { passive: true });
    $('.gallery-dots', detail)?.addEventListener('click', reveal);
  }

  function ensureEmptyCartDesign() {
    const empty = $('#cartEmpty');
    if (!empty || empty.dataset.hakiEmptyReady) return;
    empty.dataset.hakiEmptyReady = '1';

    const icon = document.createElement('div');
    icon.className = 'empty-cart-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg viewBox="0 0 48 48"><path d="M13 17h22l-2 22H15l-2-22Z"/><path d="M19 17v-3a5 5 0 0 1 10 0v3"/><path d="M19 27h10"/></svg>';
    empty.prepend(icon);

    const cta = document.createElement('a');
    cta.className = 'empty-cart-cta';
    cta.href = '#catalogo';
    cta.textContent = 'VER PRENDAS';
    cta.addEventListener('click', () => $('#closeCart')?.click());
    empty.append(cta);
  }

  function ensureSmoothProgress() {
    const nativeProgress = $('#shippingProgress');
    if (!nativeProgress) return null;
    let track = $('.haki-progress-track');
    if (!track) {
      track = document.createElement('div');
      track.className = 'haki-progress-track';
      track.setAttribute('aria-hidden', 'true');
      track.innerHTML = '<span class="haki-progress-fill"></span>';
      nativeProgress.insertAdjacentElement('afterend', track);
    }
    return $('.haki-progress-fill', track);
  }

  function syncCartPolish() {
    const drawer = $('#cartDrawer');
    const items = $('#cartItems');
    if (!drawer || !items) return;

    ensureEmptyCartDesign();
    const isEmpty = !items.querySelector('.cart-row');
    drawer.classList.toggle('is-empty', isEmpty);

    const progress = $('#shippingProgress');
    const fill = ensureSmoothProgress();
    if (progress && fill) {
      const next = Math.max(0, Math.min(100, Number(progress.value) || 0));
      const previous = Number(fill.dataset.value || 0);
      fill.dataset.value = String(next);
      if (!fill.style.width) fill.style.width = `${previous}%`;
      requestAnimationFrame(() => { fill.style.width = `${next}%`; });
      if (next !== previous) {
        const section = progress.closest('.shipping-progress');
        section?.classList.remove('progress-updated');
        requestAnimationFrame(() => {
          section?.classList.add('progress-updated');
          setTimeout(() => section?.classList.remove('progress-updated'), 380);
        });
      }
    }

    const recs = $('#cartRecommendations');
    if (recs && !recs.hidden && !isEmpty) {
      const title = $('#recommendationsTitle');
      const text = $('#recommendationsText');
      if (title) title.textContent = 'TE FALTA POCO PARA EL ENVÍO GRATIS';
      if (text) text.textContent = 'Completa tu pedido con una prenda más.';
    }
  }

  const cartItems = $('#cartItems');
  const cartEmpty = $('#cartEmpty');
  const cartRecommendations = $('#cartRecommendations');
  const shippingProgress = $('#shippingProgress');
  const productDetail = $('#productDetail');

  const cartObserver = new MutationObserver(syncCartPolish);
  if (cartItems) cartObserver.observe(cartItems, { childList: true, subtree: true });
  if (cartEmpty) cartObserver.observe(cartEmpty, { attributes: true, attributeFilter: ['hidden'] });
  if (cartRecommendations) cartObserver.observe(cartRecommendations, { attributes: true, attributeFilter: ['hidden'], childList: true, subtree: true });
  if (shippingProgress) cartObserver.observe(shippingProgress, { attributes: true, attributeFilter: ['value'] });

  const detailObserver = new MutationObserver(revealGalleryDots);
  if (productDetail) detailObserver.observe(productDetail, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });

  window.addEventListener('hashchange', () => setTimeout(revealGalleryDots, 0));
  window.addEventListener('haki:catalog-updated', () => {
    syncCartPolish();
    revealGalleryDots();
  });

  syncCartPolish();
  revealGalleryDots();
})();
