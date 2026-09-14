(() => {
  const FONT_MAP = {
    Horizon: 'Horizon, Poppins, sans-serif',
    Poppins: 'Poppins, sans-serif'
  };

  const DEFAULTS = {
    anuncio: { fuente: 'Poppins', negrita: true },
    tituloPortada: { fuente: 'Horizon', negrita: true },
    textoPortada: { fuente: 'Poppins', negrita: false },
    botonesPortada: { fuente: 'Poppins', negrita: true },
    titulosSeccion: { fuente: 'Horizon', negrita: true },
    categorias: { fuente: 'Poppins', negrita: true },
    nombreProducto: { fuente: 'Poppins', negrita: true },
    codigoProducto: { fuente: 'Poppins', negrita: false },
    precioProducto: { fuente: 'Poppins', negrita: true },
    botonesCatalogo: { fuente: 'Poppins', negrita: true },
    tituloCarrito: { fuente: 'Horizon', negrita: true },
    textoCarrito: { fuente: 'Poppins', negrita: false },
    botonesCarrito: { fuente: 'Poppins', negrita: true },
    footer: { fuente: 'Poppins', negrita: false },
    gymratTitulo: { fuente: 'Horizon', negrita: true },
    gymratTexto: { fuente: 'Poppins', negrita: false }
  };

  const SELECTORS = {
    anuncio: '.announcement, #announcementText, #countryText',
    tituloPortada: '#heroTitle',
    textoPortada: '#heroDescription',
    botonesPortada: '.hero-button',
    titulosSeccion: '.section-heading h2, .catalog-heading h2, #catalogTitle, .haki-complements h2',
    categorias: '.collection-tile h3, .catalog-filter summary, .catalog-dropdown a',
    nombreProducto: '.product-info h3, .detail-summary h1, .haki-complement-name, .gymrat-product-name',
    codigoProducto: '.product-code, .detail-code, .haki-complement-code, .gymrat-product-code',
    precioProducto: '.product-info strong, .detail-price, .haki-complement-price, .gymrat-product-price',
    botonesCatalogo: '.product-actions button, .detail-add, .size-option, .detail-size, .haki-empty-cta, .rail-actions button',
    tituloCarrito: '#cartDrawer .drawer-head h2, #cartDrawer .form-title, #cartDrawer .cart-recommendations h3, #cartDrawer .order-summary h3',
    textoCarrito: '#cartDrawer',
    botonesCarrito: '#cartDrawer button, #cartDrawer .solid, #cartDrawer .outline',
    footer: '.footer',
    gymratTitulo: '.gymrat-dialog h2, .gymrat-dialog h3, .gymrat-result-title',
    gymratTexto: '.gymrat-dialog, .gymrat-dialog label, .gymrat-dialog p, .gymrat-dialog button'
  };

  window.HAKI_TYPOGRAPHY_DEFAULTS = DEFAULTS;
  window.hakiTypographySettings = config => {
    const raw = config?.tipografia || {};
    const merged = {};
    Object.keys(DEFAULTS).forEach(key => {
      merged[key] = { ...DEFAULTS[key], ...(raw[key] || {}) };
    });
    return merged;
  };

  function applyTypography() {
    const config = window.HAKI_CONFIG || {};
    const settings = window.hakiTypographySettings(config);
    let css = '#announcementText{text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px;}';

    Object.entries(SELECTORS).forEach(([key, selector]) => {
      const setting = settings[key] || DEFAULTS[key];
      const family = FONT_MAP[setting.fuente] || FONT_MAP.Poppins;
      const weight = setting.negrita === false || setting.negrita === 'false' ? 400 : 700;
      css += `${selector}{font-family:${family}!important;font-weight:${weight}!important;}`;
    });

    let style = document.getElementById('haki-typography-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'haki-typography-style';
      document.head.appendChild(style);
    }
    style.textContent = css;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyTypography, { once: true });
  else applyTypography();

  window.addEventListener('haki:catalog-updated', applyTypography);
})();

// App-like catalog return: preserve the exact product-card DOM (and decoded images)
// while app.js restores route state. This avoids rebuilding <img> elements on Back.
(() => {
  const normalizeHash = value => {
    const hash = String(value || '').replace(/^#/, '');
    return hash ? `#${hash}` : '#top';
  };

  const hashFromUrl = value => {
    try { return normalizeHash(new URL(value, location.href).hash); }
    catch { return '#top'; }
  };

  let sourceHash = '';
  let sourceVersion = 0;

  const containmentStyle = document.createElement('style');
  containmentStyle.id = 'haki-image-paint-containment';
  containmentStyle.textContent = `
    .product-image,
    .collection-image,
    #productDetail .detail-media,
    #productDetail .detail-gallery{
      overflow:hidden!important;
      contain:paint;
      isolation:isolate;
    }
    .product-image img,
    .collection-image img,
    #productDetail .detail-gallery img{
      display:block;
      max-width:100%;
      max-height:100%;
    }
    #products .product-image{
      background-color:var(--soft,#eee);
      background-image:none!important;
    }
  `;
  document.head.appendChild(containmentStyle);

  // Remember which exact listing the user came from. Works for taps and keyboard activation.
  document.addEventListener('click', event => {
    const link = event.target.closest?.('.product-detail-link');
    if (!link || !link.hash.startsWith('#producto/')) return;
    sourceHash = normalizeHash(location.hash);
  }, true);

  // If live catalog data changes while a product is open, prefer fresh DOM on return.
  window.addEventListener('haki:catalog-updated', () => {
    sourceVersion += 1;
    sourceHash = '';
  });

  window.addEventListener('hashchange', event => {
    const oldHash = hashFromUrl(event.oldURL);
    const newHash = hashFromUrl(event.newURL);
    const leavingDetail = oldHash.startsWith('#producto/') && !newHash.startsWith('#producto/');
    const returningToSource = sourceHash && newHash === sourceHash;
    if (!leavingDetail || !returningToSource) return;

    const products = document.getElementById('products');
    if (!products || !products.childNodes.length) return;

    const versionAtCapture = sourceVersion;
    const detailCode = oldHash.slice('#producto/'.length);
    const selectedSize = document.querySelector('#productDetail .detail-size.selected')?.dataset.detailSize || '';

    // Move, don't clone: detached <img> nodes keep their decoded bitmap and listeners.
    const preserved = document.createDocumentFragment();
    while (products.firstChild) preserved.appendChild(products.firstChild);

    // app.js now runs its normal route restoration synchronously. Before the browser can paint,
    // discard the temporary rebuilt grid and put the original nodes back in exactly one microtask.
    queueMicrotask(() => {
      if (versionAtCapture !== sourceVersion || normalizeHash(location.hash) !== sourceHash) return;
      products.replaceChildren(preserved);

      // A size selected on the PDP should still be reflected on the preserved card.
      if (detailCode && selectedSize) {
        document.querySelectorAll(`#products article.product[data-code="${CSS.escape(detailCode)}"]`).forEach(card => {
          card.querySelectorAll('.size-option').forEach(option => {
            const active = option.dataset.size === selectedSize;
            option.classList.toggle('selected', active);
            option.setAttribute('aria-pressed', String(active));
          });
          const add = card.querySelector('[data-add]');
          if (add) add.disabled = false;
        });
      }
    });
  }, true);
})();
