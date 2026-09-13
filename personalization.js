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
