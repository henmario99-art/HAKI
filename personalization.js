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

// Persistent catalog view, modeled after app-like client-side navigation:
// when returning from a PDP, keep the exact grid DOM and decoded <img> elements mounted.
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

  // Remember the exact list route before the browser changes the hash to #producto/…
  document.addEventListener('click', event => {
    const link = event.target.closest?.('.product-detail-link');
    if (!link || !link.hash.startsWith('#producto/')) return;
    sourceHash = normalizeHash(location.hash);
  }, true);

  // If actual catalog data changes, do not preserve stale cards on a later return.
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
    const innerHTMLDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    let blockedRender = false;
    let preserved = null;

    // Preferred path: keep every existing card mounted and temporarily make renderProductList()
    // a no-op for this one route restoration. app.js can still restore state/title/scroll normally.
    try {
      if (innerHTMLDescriptor?.get) {
        Object.defineProperty(products, 'innerHTML', {
          configurable: true,
          get() { return innerHTMLDescriptor.get.call(this); },
          set() { /* Preserve existing catalog DOM during browser Back. */ }
        });
        Object.defineProperty(products, 'querySelectorAll', {
          configurable: true,
          value() { return []; }
        });
        blockedRender = true;
      }
    } catch {
      try { delete products.innerHTML; } catch {}
      try { delete products.querySelectorAll; } catch {}
    }

    // Compatibility fallback for browsers that do not allow the temporary element overrides.
    if (!blockedRender) {
      preserved = document.createDocumentFragment();
      while (products.firstChild) preserved.appendChild(products.firstChild);
    }

    // app.js restores the route synchronously in the same hashchange dispatch. A microtask runs
    // before the next paint, so users never see an intermediate/rebuilt product grid.
    queueMicrotask(() => {
      if (blockedRender) {
        try { delete products.innerHTML; } catch {}
        try { delete products.querySelectorAll; } catch {}
      } else if (preserved) {
        products.replaceChildren(preserved);
      }

      if (versionAtCapture !== sourceVersion || normalizeHash(location.hash) !== sourceHash) return;

      // Keep a size selected on the PDP in sync without rebuilding the card.
      if (detailCode && selectedSize) {
        const escapedCode = window.CSS?.escape ? CSS.escape(detailCode) : detailCode.replace(/["\\]/g, '\\$&');
        document.querySelectorAll(`#products article.product[data-code="${escapedCode}"]`).forEach(card => {
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
