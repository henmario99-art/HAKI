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

// Keep the already-rendered product photos visually in place while the catalog DOM is rebuilt
// after leaving a product detail. This removes the brief gray/white flash on browser-back/swipe-back.
(() => {
  const STYLE_ID = 'haki-seamless-catalog-return';
  let cleanupTimer = 0;

  const hashFromUrl = value => {
    try { return decodeURIComponent(new URL(value, location.href).hash.slice(1)); }
    catch { return ''; }
  };

  function removeFallbacks() {
    clearTimeout(cleanupTimer);
    document.getElementById(STYLE_ID)?.remove();
  }

  function captureCurrentCardImages() {
    const cards = [...document.querySelectorAll('#products article.product[data-code]')];
    if (!cards.length) return false;

    const rules = cards.map(card => {
      const img = card.querySelector('.product-image img');
      const src = img?.currentSrc || img?.src || '';
      const code = card.dataset.code || '';
      if (!src || !code) return '';
      const escapedCode = window.CSS?.escape ? CSS.escape(code) : code.replace(/["\\]/g, '\\$&');
      return `#products article.product[data-code="${escapedCode}"] .product-image{background-image:url(${JSON.stringify(src)})!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;}`;
    }).filter(Boolean);

    if (!rules.length) return false;

    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = rules.join('\n');
    return true;
  }

  function clearWhenReplacementImagesAreReady() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const images = [...document.querySelectorAll('#products .product-image img')];
      if (!images.length) {
        cleanupTimer = setTimeout(removeFallbacks, 500);
        return;
      }

      let pending = images.filter(img => !(img.complete && img.naturalWidth > 0)).length;
      if (!pending) {
        cleanupTimer = setTimeout(removeFallbacks, 80);
        return;
      }

      let finished = false;
      const done = () => {
        if (finished) return;
        pending -= 1;
        if (pending <= 0) {
          finished = true;
          cleanupTimer = setTimeout(removeFallbacks, 80);
        }
      };

      images.forEach(img => {
        if (img.complete && img.naturalWidth > 0) return;
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });

      cleanupTimer = setTimeout(removeFallbacks, 3500);
    }));
  }

  window.addEventListener('hashchange', event => {
    const oldHash = hashFromUrl(event.oldURL);
    const newHash = hashFromUrl(event.newURL);
    const leavingDetail = oldHash.startsWith('producto/') && !newHash.startsWith('producto/');
    if (!leavingDetail) return;

    clearTimeout(cleanupTimer);
    if (captureCurrentCardImages()) clearWhenReplacementImagesAreReady();
  }, true);
})();
