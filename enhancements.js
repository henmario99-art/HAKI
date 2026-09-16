(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const sizes = ['S','M','L','XL'];
  const normalize = (value='') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const products = () => window.HAKI_PRODUCTOS || [];
  const config = () => window.HAKI_CONFIG || {};
  const byCode = code => products().find(p => p.codigo === code);
  const money = n => `${config().moneda || '$'}${Number(n || 0).toFixed(2)}`;
  const soldOut = p => !sizes.some(size => !!p?.tallas?.[size]);

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function labelFor(p) {
    return soldOut(p)
      ? (String(p.etiquetaAgotado || '').trim() || 'Agotado')
      : (String(p.etiquetaDisponible || '').trim() || 'Disponible');
  }

  function applyCardStatuses() {
    $$('.product[data-code]').forEach(card => {
      const p = byCode(card.dataset.code);
      if (!p) return;
      const badge = $('.product-number', card);
      if (!badge) return;
      const out = soldOut(p);
      const text = labelFor(p);
      if (badge.textContent.trim() !== text) badge.textContent = text;
      badge.classList.add('availability-badge');
      badge.classList.toggle('sold-out', out);
    });
  }

  function currentDetailProduct() {
    let hash = '';
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch {}
    return hash.startsWith('producto/') ? byCode(hash.slice(9)) : null;
  }

  function addDetailStatus(p, detail) {
    const media = $('.detail-media', detail);
    if (!media) return;
    let badge = $('.detail-availability', media);
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'detail-availability';
      media.appendChild(badge);
    }
    const out = soldOut(p);
    badge.textContent = labelFor(p);
    badge.classList.toggle('sold-out', out);
  }

  function productType(p) {
    const collections = config().colecciones || [];
    const collectionNames = (p.colecciones || [])
      .map(id => collections.find(c => c.id === id)?.nombre || '')
      .join(' ');
    const haystack = normalize(`${p.nombre || ''} ${p.categoria || ''} ${collectionNames}`);

    if (/short|shorts|calzoneta|bermuda|pantalon corto/.test(haystack)) return 'shorts';
    if (/pants|pant|jogger|pantalon/.test(haystack)) return 'pants';
    if (/camiseta|centro|camisa|compresion|oversized|hoodie|sudadera|top|tee|shirt/.test(haystack)) return 'tops';
    if (/accesorio|cinturon|belt|muñequera|munequera|strap|gorra|bolso|calcetin/.test(haystack)) return 'accessories';
    return 'other';
  }

  function complementaryProducts(source) {
    const type = productType(source);
    const allOthers = products().filter(p => p.codigo !== source.codigo);
    let pool = [];

    if (type === 'tops') {
      pool = allOthers.filter(p => ['pants','shorts'].includes(productType(p)));
    } else if (type === 'pants' || type === 'shorts') {
      pool = allOthers.filter(p => productType(p) === 'tops');
    } else if (type === 'accessories') {
      pool = allOthers.filter(p => productType(p) !== 'accessories');
    } else {
      pool = allOthers.filter(p => ['tops','pants','shorts'].includes(productType(p)));
    }

    if (!pool.length) pool = allOthers;

    const available = pool.filter(p => !soldOut(p));
    const unavailable = pool.filter(p => soldOut(p));
    return [...available, ...unavailable].slice(0, 8);
  }

  function addComplements(p, detail) {
    const layout = $('.detail-layout', detail);
    if (!layout) return;

    const old = $('.haki-complements', detail);
    if (old?.dataset.productCode === p.codigo) return;
    if (old) old.remove();

    const picks = complementaryProducts(p);
    if (!picks.length) return;

    const section = document.createElement('section');
    section.className = 'haki-complements';
    section.dataset.productCode = p.codigo;
    section.setAttribute('aria-labelledby', 'combineTitle');
    section.innerHTML = `
      <div class="haki-complements-head">
        <div><h2 id="combineTitle">COMBÍNALOS</h2><p>Completa tu outfit con estas prendas.</p></div>
      </div>
      <div class="haki-complement-grid" tabindex="0" aria-label="Sugerencias complementarias, desplázate horizontalmente">
        ${picks.map(item => `
          <a class="haki-complement-card" href="#producto/${encodeURIComponent(item.codigo)}">
            <div class="haki-complement-image"><img src="${window.hakiImage(item.imagen || item.imagenRespaldo,400)}" alt="${String(item.nombre || '').replace(/"/g,'&quot;')}" loading="lazy"></div>
            <div class="haki-complement-info"><div><span class="haki-complement-code">${item.codigo}</span><span class="haki-complement-name">${item.nombre}</span></div><span class="haki-complement-price">${money(item.precio)}</span></div>
          </a>`).join('')}
      </div>`;

    layout.insertAdjacentElement('afterend', section);
  }

  function enhanceDetail() {
    const detail = $('#productDetail');
    if (!detail || detail.hidden) return;
    const p = currentDetailProduct();
    if (!p || !$('.detail-options', detail)) return;
    addDetailStatus(p, detail);
    addComplements(p, detail);
  }

  function quoteText() {
    const cart = (() => { try { return JSON.parse(localStorage.getItem('haki_cart_v1')) || []; } catch { return []; } })();
    const name = $('#customerName')?.value.trim() || '';
    const dept = $('#customerDepartment')?.value.trim() || '';
    const muni = $('#customerMunicipality')?.value.trim() || '';
    const lines = cart.map(i => {
      const p = byCode(i.codigo);
      if (!p) return '';
      return `• ${p.nombre} (${p.codigo}) — Talla ${i.talla} x${i.cantidad} — ${money(p.precio * i.cantidad)}`;
    }).filter(Boolean);
    const total = cart.reduce((sum, i) => sum + ((byCode(i.codigo)?.precio || 0) * i.cantidad), 0);
    return `Hola HAKI 👋\nQuiero solicitar una cotización.\n\nNombre: ${name}\nDepartamento: ${dept}\nMunicipio: ${muni}\n\nProductos:\n${lines.join('\n')}\n\nTotal estimado: ${money(total)}`;
  }

  async function instagramQuote(event) {
    const button = event.target.closest?.('#instagramQuote');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = $('#quoteForm');
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem('haki_cart_v1')) || []; } catch {}
    if (!cart.length) { showToast('Añade al menos una prenda.'); return; }
    if (form && !form.reportValidity()) return;
    const text = quoteText();
    try {
      await navigator.clipboard.writeText(text);
      showToast('Cotización copiada. Abriendo el chat de Instagram.');
    } catch {
      showToast('Abriendo el chat de Instagram.');
    }
    const handle = String(config().instagram || 'haki__sv').replace(/^@/, '');
    window.open(`https://ig.me/m/${encodeURIComponent(handle)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  function autoOpenCartAfterDetailAdd(event) {
    const button = event.target.closest?.('.detail-add');
    const detail = $('#productDetail');
    if (!button || !detail?.contains(button)) return;
    const selected = $('.detail-size.selected:not(:disabled)', detail);
    if (!selected) return;
    setTimeout(() => $('#openCart')?.click(), 0);
  }

  function setupEmptyCart() {
    const empty = $('#cartEmpty');
    if (!empty || empty.dataset.hakiEmptyReady) return;
    empty.dataset.hakiEmptyReady = '1';
    empty.innerHTML = `
      <div class="haki-empty-bag" aria-hidden="true">
        <svg viewBox="0 0 64 64" role="img">
          <path d="M15 23h34l-3 30H18L15 23Z"></path>
          <path d="M24 23v-4a8 8 0 0 1 16 0v4"></path>
          <path d="M24 37h16"></path>
        </svg>
      </div>
      <strong>TU CARRITO ESTÁ VACÍO</strong>
      <span>Encuentra tu próxima prenda HAKI y arma tu outfit.</span>
      <button class="haki-empty-cta" id="emptyCartShopButton" type="button">VER PRENDAS <span aria-hidden="true">→</span></button>
    `;
    $('#emptyCartShopButton')?.addEventListener('click', () => {
      $('#closeCart')?.click();
      if (location.hash === '#catalogo') {
        $('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        location.hash = '#catalogo';
      }
    });
  }

  function syncEmptyCart() {
    const drawer = $('#cartDrawer');
    const items = $('#cartItems');
    if (!drawer || !items) return;
    drawer.classList.toggle('is-empty', !items.querySelector('.cart-row'));
  }

  let animateProgressOnNextCartChange = false;

  function setupShippingProgress() {
    const native = $('#shippingProgress');
    if (!native) return;

    let visual = $('#hakiShippingProgress');
    if (!visual) {
      visual = document.createElement('div');
      visual.id = 'hakiShippingProgress';
      visual.className = 'haki-shipping-progress';
      visual.setAttribute('aria-hidden', 'true');
      visual.innerHTML = '<span class="haki-shipping-fill"></span>';
      native.classList.add('haki-native-progress');
      native.insertAdjacentElement('afterend', visual);
    }

    if (!native.dataset.hakiProgressObserved) {
      native.dataset.hakiProgressObserved = '1';
      new MutationObserver(() => {
        if (!animateProgressOnNextCartChange) syncShippingProgress(false);
      }).observe(native, {
        attributes: true,
        attributeFilter: ['value']
      });
    }

    syncShippingProgress(false, true);
  }

  function syncShippingProgress(fromZero = false, immediate = false) {
    const native = $('#shippingProgress');
    const visual = $('#hakiShippingProgress');
    const fill = $('.haki-shipping-fill', visual || document);
    if (!native || !visual || !fill) return;

    const target = Math.max(0, Math.min(100, Number(native.value) || 0));
    visual.classList.toggle('is-complete', target >= 100);

    if (matchMedia('(prefers-reduced-motion: reduce)').matches || immediate) {
      fill.style.transition = 'none';
      fill.style.width = `${target}%`;
      fill.dataset.progress = String(target);
      requestAnimationFrame(() => { fill.style.transition = ''; });
      return;
    }

    if (fromZero) {
      fill.style.transition = 'none';
      fill.style.width = '0%';
      fill.dataset.progress = '0';
      void fill.offsetWidth;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fill.style.transition = '';
          fill.style.width = `${target}%`;
          fill.dataset.progress = String(target);
        });
      });
      return;
    }

    fill.style.width = `${target}%`;
    fill.dataset.progress = String(target);
  }

  function prepareShippingAnimationFromAdd(event) {
    const button = event.target.closest?.('[data-add], .detail-add');
    if (!button || button.disabled) return;

    if (button.classList.contains('detail-add')) {
      const detail = $('#productDetail');
      if (!detail?.contains(button) || !$('.detail-size.selected:not(:disabled)', detail)) return;
    }

    animateProgressOnNextCartChange = true;
    setupShippingProgress();

    const fill = $('.haki-shipping-fill');
    if (!fill || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    fill.style.transition = 'none';
    fill.style.width = '0%';
    fill.dataset.progress = '0';
    void fill.offsetWidth;
  }

  function polishFooter() {
    const serviceLabels = new Map([
      ['encomiendas.html', 'Encomiendas'],
      ['domicilios.html', 'Domicilios'],
      ['cambios-devoluciones.html', 'Cambios']
    ]);
    $$('.footer-service-links a').forEach(link => {
      const file = (link.getAttribute('href') || '').split('/').pop();
      link.textContent = serviceLabels.get(file) || link.textContent.replace(/↗/g, '').trim();
    });
    $$('.footer-links a').forEach(link => {
      link.textContent = link.textContent.replace(/↗/g, '').trim();
    });
  }

  function smoothCategoryDialog() {
    const dialog = $('#categoryMenu');
    if (!dialog || dialog.dataset.smoothPatched) return;
    dialog.dataset.smoothPatched = '1';
    const nativeClose = dialog.close.bind(dialog);
    const nativeShow = dialog.showModal.bind(dialog);
    dialog.close = function(value) {
      if (!dialog.open || dialog.classList.contains('closing')) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { nativeClose(value); return; }
      dialog.classList.add('closing');
      setTimeout(() => { nativeClose(value); dialog.classList.remove('closing'); }, 245);
    };
    dialog.showModal = function() {
      dialog.classList.remove('closing');
      nativeShow();
    };
    dialog.addEventListener('close', () => dialog.classList.remove('closing'));
  }

  let scheduled = false;
  function enhance() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      observer.disconnect();
      applyCardStatuses();
      enhanceDetail();
      setupEmptyCart();
      syncEmptyCart();
      setupShippingProgress();

      ['products','newProducts','productDetail'].forEach(id=>observer.observe(document.getElementById(id),{childList:true,subtree:true}));

    });
  }

  document.addEventListener('click', prepareShippingAnimationFromAdd, true);
  document.addEventListener('click', autoOpenCartAfterDetailAdd);
  smoothCategoryDialog();
  const observer = new MutationObserver(enhance);
  window.addEventListener('haki:listing-surface', enhance);
  ['products','newProducts','productDetail'].forEach(id=>observer.observe(document.getElementById(id),{childList:true,subtree:true}));
  const cartItems = $('#cartItems');
  if (cartItems) new MutationObserver(() => {
    const animateFromAdd = animateProgressOnNextCartChange;
    animateProgressOnNextCartChange = false;
    setupEmptyCart();
    syncEmptyCart();
    setupShippingProgress();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => syncShippingProgress(animateFromAdd));
    });
  }).observe(cartItems,{childList:true,subtree:true});
  window.addEventListener('hashchange', () => {
    enhance();
    setTimeout(enhance, 40);
  });
  window.addEventListener('load', enhance);
  setupEmptyCart();
  syncEmptyCart();
  setupShippingProgress();
  enhance();
})();
