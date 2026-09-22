(() => {
  const CONFIG = window.HAKI_CONFIG || {};
  const ALL_PRODUCTS = (window.HAKI_PRODUCTOS || []).filter(p => p.borrador !== true);
  const hasStock = p => ['S','M','L','XL'].some(size => !!p?.tallas?.[size]);
  const COLLECTIONS = window.hakiCollections(CONFIG);

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const freshImage = (url, size=800) => window.hakiImage(url,size);
  let detailCode = null;
  let lastListingHash = '#top';
  const listingPositions = new Map();
  const renderedLists = new WeakMap();
  const listingNodes = new Map();
  const isIOS = window.hakiIOSWebKit === true;
  const listingSections = ['homeHero', 'novedades', 'collectionsSection', 'catalogo'];
  let iosListing = null;
  let iosCategory = null;
  let iosHome = null;
  const iosCategoryViews = new Map();
  let routedHash = null;
  let routedEntry = null;
  let entrySequence = 0;
  const navigationSession = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const isCategoryHash = hash => /^#(?:coleccion|categoria)\//.test(hash || '');
  const isCatalogHash = hash => /^#(?:producto\/|coleccion\/|categoria\/|top$|catalogo$|novedades$|collectionsSection$)/.test(hash || '');

  function navigationEntry() {
    const hash = location.hash || '#top';
    let entry = history.state?.hakiNavigation;
    if (!entry || entry.hash !== hash) {
      entry = { key: `${navigationSession}-${++entrySequence}`, hash };
      history.replaceState({ ...history.state, hakiNavigation: entry }, '', location.href);
    }
    return entry;
  }

  function rememberListing() {
    if (detailCode || !routedEntry) return;
    listingPositions.set(routedEntry, {
      y: iosCategory ? iosCategory.scrollTop : window.scrollY, query: state.query,
      category: state.category, collection: state.collection
    });
  }

  // One owner on every device: native restoration must not race the router.
  history.scrollRestoration = 'manual';

  const state = {
    query: '',
    category: 'Todos',
    collection: null,
    selected: {},
    cart: loadCart()
  };

  const els = {
    products: $('#products'),
    count: $('#productCount'),
    search: $('#searchInput'),
    notice: $('#resultNotice'),
    openCart: $('#openCart'),
    closeCart: $('#closeCart'),
    drawer: $('#cartDrawer'),
    overlay: $('#overlay'),
    cartCount: $('#cartCount'),
    cartItems: $('#cartItems'),
    cartEmpty: $('#cartEmpty'),
    total: $('#cartTotal'),
    form: $('#quoteForm'),
    igQuote: $('#instagramQuote'),
    toast: $('#toast')
  };

  function esc(value = '') {
    return String(value).replace(
      /[&<>'"]/g,
      c =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        })[c]
    );
  }

  function money(n) {
    return `${CONFIG.moneda || '$'}${Number(n).toFixed(2)}`;
  }

  function normalize(s = '') {
    return s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function fallbackFor(p) {
    return p.imagenRespaldo || 'images/producto.svg';
  }

  function saveCart() {
    try { localStorage.setItem('haki_cart_v1', JSON.stringify(state.cart)); } catch {}
  }

  function loadCart() {
    try {
      const cart = JSON.parse(localStorage.getItem('haki_cart_v1')); return Array.isArray(cart) ? cart.filter(i=>i&&Number.isInteger(i.cantidad)&&i.cantidad>0) : [];
    } catch {
      return [];
    }
  }

  function productByCode(code) {
    return ALL_PRODUCTS.find(p => p.codigo === code);
  }

  function applyConfig() {
    applyExperience();
    $('#announcementText').textContent =
      CONFIG.anuncio || 'HECHO PARA TU SIGUIENTE NIVEL';

    $('#countryText').textContent =
      CONFIG.pais || 'HAKI · EL SALVADOR';

    const coverTitle = $('#heroTitle');
    if (coverTitle) {
      coverTitle.replaceChildren();
      coverTitle.hidden = true;
      coverTitle.setAttribute('aria-hidden', 'true');
    }
    const coverDescription = $('#heroDescription');
    if (coverDescription) {
      coverDescription.textContent = '';
      coverDescription.hidden = true;
      coverDescription.setAttribute('aria-hidden', 'true');
    }

    const hero = $('#heroImage');
    if (window.HAKI_COVER_WAITING_LIVE) {
      hero.removeAttribute('src');
      hero.removeAttribute('srcset');
      hero.style.visibility = 'hidden';
    } else if (window.HAKI_COVER) {
      window.HAKI_COVER.paint(hero, CONFIG);
    } else {
      const coverVersion = String(CONFIG.portadaRevision || CONFIG.catalogVersion || '');
      const versioned = url => {
        const value = String(url || '').trim();
        if (!value || !coverVersion || /^(?:data:|blob:)/i.test(value)) return value;
        return `${value}${value.includes('?') ? '&' : '?'}v=${encodeURIComponent(coverVersion)}`;
      };
      const coverBase = CONFIG.portadaOriginal || CONFIG.portadaDesktop || CONFIG.portada || CONFIG.portadaRespaldo || '';
      const desktopCover = CONFIG.portadaOriginal || CONFIG.portadaDesktop || CONFIG.portada || CONFIG.portadaRespaldo || '';
      const coverVariants = [
        [CONFIG.portadaMobile, Number(CONFIG.portadaMobileWidth) || 1440],
        [CONFIG.portadaTablet, Number(CONFIG.portadaTabletWidth) || 2200],
        [CONFIG.portadaDesktop, Number(CONFIG.portadaDesktopWidth) || 3200],
        [CONFIG.portadaOriginal || CONFIG.portada, Number(CONFIG.portadaOriginalWidth || CONFIG.portadaDesktopWidth) || 4096],
      ].filter(([url,width]) => String(url || '').trim() && Number(width) > 0);
      const uniqueCoverVariants = coverVariants.filter(([url], index, list) =>
        list.findIndex(([candidate]) => candidate === url) === index
      );
      const responsiveCoverSrcset = uniqueCoverVariants.length > 1
        ? uniqueCoverVariants.map(([url, width]) => `${versioned(url)} ${width}w`).join(', ')
        : '';

      hero.src = desktopCover
        ? versioned(desktopCover)
        : versioned(freshImage(CONFIG.portadaRespaldo || 'images/hero-fallback.svg', 2560));
      if (responsiveCoverSrcset) hero.srcset = responsiveCoverSrcset;
      else hero.removeAttribute('srcset');
      hero.sizes = '100vw';
      hero.fetchPriority = 'high';
      hero.decoding = 'async';
      hero.style.visibility = '';

      hero.onerror = () => {
        hero.onerror = null;
        hero.removeAttribute('srcset');
        hero.src = versioned(freshImage(CONFIG.portadaRespaldo || 'images/hero-fallback.svg', 2560));
      };
    }

    const ig = `https://www.instagram.com/${
      CONFIG.instagram || 'haki__sv'
    }/`;

    $('#instagramHeader').href = ig;
    $('#instagramFooter').href = ig;
    $('#whatsappFooter').href = `https://wa.me/${String(CONFIG.whatsapp || '').replace(/\D/g, '')}`;
    [['facebookFooter', CONFIG.facebook], ['tiktokFooter', CONFIG.tiktok]].forEach(([id, url]) => {
      const link = document.getElementById(id);
      try { const parsed = new URL(url); if (!['https:', 'http:'].includes(parsed.protocol)) return; link.href = parsed.href; link.hidden = false; } catch {}
    });

    $('#year').textContent = new Date().getFullYear();
    $('#collectionsTitle').textContent = CONFIG.tituloColecciones || 'EXPLORA POR CATEGORÍA';

    // The editable mark belongs to the cover, not the header or footer.
    const customBrandIcon = String(CONFIG.iconoHaki || '').trim();
    const heroTitle = $('#heroTitle');
    if (customBrandIcon && heroTitle) {
      const frame = document.createElement('span');
      frame.className = 'hero-brand-icon';
      frame.style.cssText = 'display:block;position:relative;overflow:hidden;height:clamp(112px,15svh,142px);width:97px;max-width:100%';
      const mark = document.createElement('img');
      mark.alt = CONFIG.marca || 'HAKI';
      mark.crossOrigin = 'anonymous';
      mark.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;object-position:left center;max-width:none';
      // Measure alpha only to frame the visible symbol; keep the original file.
      mark.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 512 / Math.max(mark.naturalWidth, mark.naturalHeight));
          canvas.width = Math.max(1, Math.round(mark.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(mark.naturalHeight * scale));
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(mark, 0, 0, canvas.width, canvas.height);
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              if (pixels[(y * canvas.width + x) * 4 + 3] < 16) continue;
              left = Math.min(left, x); right = Math.max(right, x);
              top = Math.min(top, y); bottom = Math.max(bottom, y);
            }
          }
          if (right < left || bottom < top) return;
          const width = right - left + 1, height = bottom - top + 1;
          frame.style.width = `calc(clamp(112px,15svh,142px) * ${width / height})`;
          mark.style.cssText = `position:absolute;display:block;max-width:none;width:${canvas.width / width * 100}%;height:${canvas.height / height * 100}%;left:${-left / width * 100}%;top:${-top / height * 100}%`;
        } catch {
          // Cross-origin providers without CORS still display within the larger frame.
        }
      };
      mark.onerror = () => { heroTitle.textContent = CONFIG.frase || 'HAKI'; };
      mark.src = freshImage(customBrandIcon, 640);
      frame.append(mark);
      heroTitle.replaceChildren(frame);
    }

    const video = $('#heroVideo');
    const isVideo = CONFIG.tipoPortada === 'video' && CONFIG.videoPortada;
    if (isVideo) {
      video.src = freshImage(CONFIG.videoPortada);
      video.muted = true;
      video.hidden = false;
      $('#toggleHeroVideo').hidden = false;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) { video.autoplay = false; video.pause(); }
      else video.play().catch(() => {});
      const syncVideoButton = () => {
        $('#toggleHeroVideo').textContent = video.paused ? '▶' : 'Ⅱ';
        $('#toggleHeroVideo').setAttribute('aria-label', video.paused ? 'Reproducir video de portada' : 'Pausar video de portada');
      };
      video.addEventListener('play', syncVideoButton);
      video.addEventListener('pause', syncVideoButton);
      video.addEventListener('error', () => { video.hidden = true; $('#toggleHeroVideo').hidden = true; });
      $('#toggleHeroVideo').addEventListener('click', () => { if (video.paused) video.play().catch(() => {}); else video.pause(); });
      syncVideoButton();
    }
  }

  function visibleProducts() {
    const q = normalize(state.query.trim());

    return ALL_PRODUCTS.filter(
      p =>
        hasStock(p) &&
        (state.category === 'Todos' ||
          normalize(p.categoria || '') === normalize(state.category)) &&
        (!state.collection || inCollection(p, state.collection)) &&
        (!q ||
          normalize(
            `${p.codigo} ${p.nombre} ${p.categoria}`
          ).includes(q))
    );
  }

  function inCollection(p, collection) {
    if (Array.isArray(p.colecciones)) return p.colecciones.includes(collection.id);
    return normalize(p.categoria || '') === normalize(collection.categoria || collection.nombre);
  }

  const SIZE_GUIDES = {
    compression: {
      label: 'COMPRESIÓN',
      description: 'Medidas para camisetas de compresión y centros.',
      headers: ['Talla USA', 'Pecho (cm)', 'Hombro (cm)', 'Largo (cm)'],
      rows: [
        ['S', '84–88', '39', '60'],
        ['M', '88–92', '40', '61'],
        ['L', '89–105', '41', '62'],
        ['XL', '93–112', '43', '64']
      ]
    },
    oversized: {
      label: 'OVERSIZED',
      description: 'Medidas de camisas oversized según la tabla proporcionada.',
      headers: ['Talla', 'Hombro (cm)', 'Pecho (cm)', 'Largo (cm)', 'Manga (cm)'],
      rows: [
        ['M', '49', '51', '70', '20'],
        ['L', '51', '53', '72', '20'],
        ['XL', '53', '55', '74', '22'],
        ['XXL', '55', '57', '76', '22'],
        ['XXXL', '57', '59', '78', '24']
      ]
    },
    pants: {
      label: 'PANTS',
      description: 'Medidas de pants según la tabla proporcionada.',
      headers: ['Talla', 'Cintura (in)', 'Entrepierna (in)', 'Largo (in)'],
      rows: [
        ['S', '30', '27.9', '40'],
        ['M', '32', '28.5', '41'],
        ['L', '34', '29.1', '42'],
        ['XL', '36', '29.8', '43'],
        ['XXL', '38', '30.4', '44']
      ]
    },
    shorts: {
      label: 'SHORTS',
      description: 'Referencia genérica para shorts de hombre.',
      headers: ['Talla', 'Cintura (cm)', 'Cadera (cm)'],
      rows: [
        ['S', '73–81', '88–96'],
        ['M', '81–89', '96–104'],
        ['L', '89–97', '104–112'],
        ['XL', '97–109', '112–120']
      ],
      note: 'Las medidas de shorts son una referencia genérica; el ajuste puede variar según el modelo.'
    }
  };

  function productSizeGuideType(p) {
    const ownCategory = normalize(p?.categoria || '');
    const linkedCollections = (p?.colecciones || [])
      .map(id => COLLECTIONS.find(collection => collection.id === id))
      .filter(Boolean);
    const collectionNames = normalize(linkedCollections.map(collection => collection.nombre || '').join(' '));
    const collectionCategories = normalize(linkedCollections.map(collection => collection.categoria || '').join(' '));

    // La categoría visual manda para Oversized; Pants y Shorts se separan por
    // la categoría propia de cada producto cuando comparten la misma colección.
    if (/oversized|oversize/.test(collectionNames)) return 'oversized';
    if (/oversized|oversize/.test(ownCategory)) return 'oversized';
    if (/short|calzoneta|bermuda/.test(ownCategory)) return 'shorts';
    if (/pants|pant|jogger|pantalon/.test(ownCategory)) return 'pants';

    const hasShorts = /short|calzoneta|bermuda/.test(collectionNames);
    const hasPants = /pants|pant|jogger|pantalon/.test(collectionNames);
    if (hasShorts && !hasPants) return 'shorts';
    if (hasPants && !hasShorts) return 'pants';

    if (/compresion|camiseta|centro|camisa/.test(collectionNames)) return 'compression';
    if (/compresion|camiseta|centro|camisa|top/.test(ownCategory)) return 'compression';

    if (/short|calzoneta|bermuda/.test(collectionCategories)) return 'shorts';
    if (/pants|pant|jogger|pantalon/.test(collectionCategories)) return 'pants';
    if (/compresion|camiseta|centro|camisa|top/.test(collectionCategories)) return 'compression';
    return null;
  }

  function renderSizeGuide(type = 'compression') {
    const guide = SIZE_GUIDES[type] || SIZE_GUIDES.compression;
    const title = $('#sizeGuideTitle');
    const description = $('#sizeGuideDescription');
    const content = $('#sizeGuideContent');
    const tabs = $('#sizeGuideTabs');
    if (!content) return;

    if (title) title.textContent = `Guía de tallas · ${guide.label}`;
    if (description) {
      description.textContent = '';
      description.hidden = true;
      description.style.display = 'none';
    }

    if (tabs) {
      $$('[data-size-guide]', tabs).forEach(button => {
        const active = button.dataset.sizeGuide === type;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
        button.onclick = () => renderSizeGuide(button.dataset.sizeGuide);
      });
    }

    content.innerHTML = `
      <div class="menu-size-guide-scroll">
        <table class="menu-size-guide-table">
          <thead><tr>${guide.headers.map(header => `<th scope="col">${esc(header)}</th>`).join('')}</tr></thead>
          <tbody>${guide.rows.map(row => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
      ${guide.note ? `<p class="size-guide-note">${esc(guide.note)}</p>` : ''}
    `;
  }

  function openSizeGuide(type = 'compression', allowCategories = true) {
    const tabs = $('#sizeGuideTabs');
    if (tabs) {
      tabs.hidden = !allowCategories;
      tabs.style.display = allowCategories ? '' : 'none';
    }
    renderSizeGuide(type);
    const dialog = $('#sizeGuideDialog');
    if (dialog && !dialog.open) dialog.showModal();
  }

  window.HAKI_OPEN_SIZE_GUIDE = openSizeGuide;

  function renderProducts() {
    const list = visibleProducts();

    els.count.textContent = `${list.length} productos`;

    els.notice.textContent =
      list.length === ALL_PRODUCTS.length
        ? ''
        : `${list.length} producto${
            list.length === 1 ? '' : 's'
          } encontrado${list.length === 1 ? '' : 's'}.`;

    renderProductList(els.products, list);
    if (!list.length) els.notice.textContent = 'No hay prendas disponibles en esta selección.';
  }

  function renderProductList(container, list) {
    const signature = JSON.stringify(list);
    if (renderedLists.get(container) === signature) {
      syncCardSelections(container);
      return;
    }
    // Keep a few visited listings' real image nodes and event handlers. Returning
    // from a category should not replace/redecode the entire product grid.
    if (container === els.products) {
      const previous = renderedLists.get(container);
      if (previous) {
        const fragment = document.createDocumentFragment();
        while (container.firstChild) fragment.append(container.firstChild);
        listingNodes.set(previous, fragment);
      }
      const cached = listingNodes.get(signature);
      if (cached) {
        listingNodes.delete(signature);
        container.replaceChildren(cached);
        renderedLists.set(container, signature);
        syncCardSelections(container);
        return;
      }
      while (listingNodes.size > 5) listingNodes.delete(listingNodes.keys().next().value);
    }
    renderedLists.set(container, signature);
    container.innerHTML = list
      .map((p, index) => {
        const selected = state.selected[p.codigo] || '';

        const sizes = ['S', 'M', 'L', 'XL']
          .map(size => {
            const available = !!p.tallas?.[size];

            return `
              <button
                class="size-option ${
                  !available ? 'unavailable' : ''
                } ${
                  selected === size ? 'selected' : ''
                }"
                type="button"
                data-code="${esc(p.codigo)}"
                data-size="${size}"
                ${!available ? 'disabled' : ''}
                aria-pressed="${selected === size}"
              >
                ${size}
              </button>
            `;
          })
          .join('');

        return `
          <article
            class="product"
            data-code="${esc(p.codigo)}"
          >

            <a class="product-image product-detail-link" href="#producto/${encodeURIComponent(p.codigo)}" aria-label="Ver ${esc(p.nombre)}">

              <img
                src="${esc(freshImage(p.imagen, 560))}"
                data-fallback="${esc(
                  freshImage(fallbackFor(p))
                )}"
                alt="${esc(p.nombre)}"
                loading="${index < 4 ? 'eager' : 'lazy'}" fetchpriority="${index < 2 ? 'high' : 'auto'}" decoding="async" width="400" height="500" srcset="${esc(window.hakiSrcset(p.imagen))}" sizes="(max-width:800px) 50vw, 25vw"
              >

              <span class="product-number">
                ${p.novedad === true ? 'NUEVO' : esc(String(p.id).padStart(2, '0'))}
              </span>

              ${p.masVendido === true ? `<span class="best-seller-badge">${esc(String(p.etiquetaMasVendido || '').trim() || 'MÁS VENDIDO')}</span>` : ''}

            </a>

            <a class="product-info product-detail-link" href="#producto/${encodeURIComponent(p.codigo)}">

              <div>
                <p class="product-code">
                  ${esc(p.codigo)}
                </p>

                <h3>
                  ${esc(p.nombre)}
                </h3>
              </div>

              <strong>
                ${money(p.precio)}
              </strong>

            </a>

            <div class="product-actions">
              <div
                class="sizes"
                aria-label="Tallas de ${esc(p.nombre)}"
              >
                ${sizes}
              </div>

              <button
                class="add"
                type="button"
                data-add="${esc(p.codigo)}"
                ${p.tallas?.[selected] ? '' : 'disabled'}
                aria-label="Añadir ${esc(p.nombre)} al carrito"
              >
                <span aria-hidden="true">+</span> AÑADIR AL CARRITO
              </button>

            </div>

          </article>
        `;
      })
      .join('');

    $$('img[data-fallback]', container).forEach(img =>
      img.addEventListener(
        'error',
        () => {
          const fb = img.dataset.fallback;

          if (img.src === fb) return;

          img.src = fb;
        },
        { once: true }
      )
    );

    $$('.size-option:not(:disabled)', container).forEach(
      btn =>
        btn.addEventListener('click', () => {
          state.selected[btn.dataset.code] =
            btn.dataset.size;

          // Update matching cards without replacing nodes or losing carousel/focus position.
          $$('article[data-code]').filter(card => card.dataset.code === btn.dataset.code).forEach(card => {
            $$('.size-option', card).forEach(option => {
              const active = option.dataset.size === btn.dataset.size;
              option.classList.toggle('selected', active);
              option.setAttribute('aria-pressed', String(active));
            });
            $('[data-add]', card).disabled = false;
            const label = $('.card-size-label', card);
            if (label) label.textContent = `TALLA ${btn.dataset.size}`;
          });
        })
    );

    $$('[data-add]', container).forEach(btn =>
      btn.addEventListener('click', () =>
        addToCart(btn.dataset.add)
      )
    );
  }

  function syncCardSelections(container) {
    $$('article.product[data-code]', container).forEach(card => {
      const selected = state.selected[card.dataset.code];
      $$('.size-option', card).forEach(option => {
        const active = !option.disabled && option.dataset.size === selected;
        option.classList.toggle('selected', active);
        option.setAttribute('aria-pressed', String(active));
      });
      $('[data-add]', card).disabled = !productByCode(card.dataset.code)?.tallas?.[selected];
      const label = $('.card-size-label', card);
      if (label) label.textContent = productByCode(card.dataset.code)?.tallas?.[selected] ? `TALLA ${selected}` : 'ELIGE TU TALLA';
    });
  }

  // Capture before menu handlers or a fragment change can alter the layout.
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || detailCode || event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || destination.pathname !== location.pathname ||
        destination.search !== location.search || !isCatalogHash(destination.hash)) return;
    rememberListing();
    if (destination.hash.startsWith('#producto/')) lastListingHash = location.hash || '#top';
  }, true);

  // A category uses the same fixed scroll surface as a product. The home
  // document stays connected, decoded and at its original window.scrollY.
  // Only the active catalog owns the public IDs used by the shared controls.
  function catalogIds(catalog, active) {
    [catalog, ...catalog.querySelectorAll('[id], [data-catalog-id]')].forEach(el => {
      const id = el.dataset.catalogId || el.id;
      if (!id) return;
      el.dataset.catalogId = id;
      if (active) el.id = id;
      else el.removeAttribute('id');
    });
  }

  function bindCatalog(catalog) {
    els.products = catalog.querySelector('#products');
    els.count = catalog.querySelector('#productCount');
    els.notice = catalog.querySelector('#resultNotice');
    window.dispatchEvent(new Event('haki:listing-surface'));
  }

  function enterIOSCategory(key) {
    if (!isIOS || iosCategory?.dataset.entryKey === key) return;
    if (!iosHome) {
      const catalog = $('#catalogo');
      // Direct category links also need a populated home behind the sheet.
      if (!els.products.childNodes.length) renderProducts();
      iosHome = {
        catalog,
        sections: [...listingSections.map(id => document.getElementById(id)), $('.footer')]
          .map(el => ({ el, inert: el?.inert || false }))
      };
      iosHome.sections.forEach(({el}) => { if (el) el.inert = true; });
      catalogIds(catalog, false);
    }
    if (iosCategory) {
      catalogIds(iosCategory, false);
      iosCategory.hidden = true;
    }
    let catalog = iosCategoryViews.get(key);
    if (!catalog) {
      catalog = document.createElement('section');
      catalog.className = 'catalog haki-ios-category-sheet';
      catalog.id = 'catalogo';
      catalog.dataset.entryKey = key;
      catalog.innerHTML = `<div class="catalog-heading"><div>
        <a class="back-home haki-chevron-back" href="#top" aria-label="Volver a las prendas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg></a>
        <h2 id="catalogTitle"></h2></div><span class="product-count" id="productCount"></span></div>
        <p class="notice" id="resultNotice" role="status"></p><div class="products" id="products"></div>`;
      iosCategoryViews.set(key, catalog);
      $('#productDetail').before(catalog);
    }
    iosCategory = catalog;
    catalogIds(catalog, true);
    catalog.hidden = false;
    bindCatalog(catalog);
    document.documentElement.style.setProperty('--haki-detail-top', `${Math.max(0, Math.ceil($('.header')?.getBoundingClientRect().bottom || 0))}px`);
    document.body.classList.add('haki-ios-category-open');
  }

  function leaveIOSCategory() {
    if (!iosCategory) return;
    iosCategory.hidden = true;
    catalogIds(iosCategory, false);
    iosCategory = null;
    catalogIds(iosHome.catalog, true);
    iosHome.sections.forEach(({el, inert}) => { if (el) el.inert = inert; });
    bindCatalog(iosHome.catalog);
    iosHome = null;
    document.body.classList.remove('haki-ios-category-open');
  }

  function enterIOSDetail() {
    if (!isIOS || iosListing) return;
    iosListing = [...listingSections.map(id => document.getElementById(id)), $('.footer')].map(el => {
      const saved = { el, inert: el?.inert || false };
      if (el) el.inert = true;
      return saved;
    });
    // Measure the sticky header: the announcement has already scrolled away
    // when a customer opens a product from further down the catalog.
    document.documentElement.style.setProperty('--haki-detail-top', `${Math.max(0, Math.ceil($('.header')?.getBoundingClientRect().bottom || 0))}px`);
    document.body.classList.add('haki-ios-product-open');
  }

  function leaveIOSDetail() {
    if (!iosListing) return;
    const detail = $('#productDetail');
    // Retire the scroll layer before removing its fixed positioning. Keep the
    // listing nodes and their decoded images intact for the return transition.
    detail.hidden = true;
    detail.replaceChildren();
    iosListing.forEach(({ el, inert }) => { if (el) el.inert = inert; });
    iosListing = null;
    document.body.classList.remove('haki-ios-product-open');
  }

  function addToCart(code) {
    const p = productByCode(code);
    const size = state.selected[code];

    if (
      !p ||
      !size ||
      !p.tallas[size]
    )
      return;

    const existing = state.cart.find(
      i =>
        i.codigo === code &&
        i.talla === size
    );

    if (existing) {
      existing.cantidad += 1;
    } else {
      state.cart.push({
        codigo: code,
        talla: size,
        cantidad: 1
      });
    }

    saveCart();
    renderCart();
    openCart();

    showToast(
      `${p.nombre} · ${size} añadida`
    );
  }

  function changeQty(code, size, delta) {
    const item = state.cart.find(
      i =>
        i.codigo === code &&
        i.talla === size
    );

    if (!item) return;

    item.cantidad += delta;

    if (item.cantidad <= 0) {
      state.cart = state.cart.filter(
        i => i !== item
      );
    }

    saveCart();
    renderCart();
  }

  function removeItem(code, size) {
    state.cart = state.cart.filter(
      i =>
        !(
          i.codigo === code &&
          i.talla === size
        )
    );

    saveCart();
    renderCart();
  }

  function cartTotal() {
    return state.cart.reduce(
      (sum, i) =>
        sum +
        (productByCode(i.codigo)?.precio || 0) *
          i.cantidad,
      0
    );
  }

  function itemCount() {
    return state.cart.reduce(
      (sum, i) => sum + i.cantidad,
      0
    );
  }

  function renderCart() {
    els.cartCount.textContent = itemCount();

    els.cartEmpty.hidden =
      state.cart.length > 0;

    renderShipping();

    els.cartItems.innerHTML = state.cart
      .map(i => {
        const p = productByCode(i.codigo);

        if (!p) return '';

        return `
          <div class="cart-row">

            <img
              class="cart-thumb"
              src="${esc(freshImage(p.imagen))}"
              data-fallback="${esc(
                freshImage(fallbackFor(p))
              )}"
              alt=""
            >

            <div>

              <p>
                ${esc(p.codigo)}
                · TALLA
                ${esc(i.talla)}
              </p>

              <h4>
                ${esc(p.nombre)}
              </h4>

              <div class="qty">

                <button
                  type="button"
                  data-qty="-1"
                  data-code="${esc(i.codigo)}"
                  data-size="${esc(i.talla)}"
                >
                  −
                </button>

                <span>
                  ${i.cantidad}
                </span>

                <button
                  type="button"
                  data-qty="1"
                  data-code="${esc(i.codigo)}"
                  data-size="${esc(i.talla)}"
                >
                  +
                </button>

              </div>

              <button
                class="remove"
                type="button"
                data-remove="1"
                data-code="${esc(i.codigo)}"
                data-size="${esc(i.talla)}"
              >
                ${esc(settings().eliminarTexto)}
              </button>

            </div>

            <div class="price">
              ${money(
                p.precio * i.cantidad
              )}
            </div>

          </div>
        `;
      })
      .join('');

    $$('[data-qty]', els.cartItems).forEach(
      b =>
        b.addEventListener('click', () =>
          changeQty(
            b.dataset.code,
            b.dataset.size,
            Number(b.dataset.qty)
          )
        )
    );

    $$('[data-remove]', els.cartItems).forEach(
      b =>
        b.addEventListener('click', () =>
          removeItem(
            b.dataset.code,
            b.dataset.size
          )
        )
    );

    $$(
      'img[data-fallback]',
      els.cartItems
    ).forEach(img =>
      img.addEventListener(
        'error',
        () => {
          img.src = img.dataset.fallback;
        },
        { once: true }
      )
    );
  }

  function openCart() {
    closeMenu();
    closeSearch();
    els.drawer.inert = false;
    els.closeCart.focus();
    els.overlay.hidden = false;

    requestAnimationFrame(() =>
      els.drawer.classList.add('open')
    );

    els.drawer.setAttribute(
      'aria-hidden',
      'false'
    );

    document.body.classList.add(
      'cart-open'
    );
  }

  function closeCart() {
    if (els.drawer.getAttribute('aria-hidden') === 'true') return;
    els.drawer.inert = true;
    els.openCart.focus();
    els.drawer.classList.remove('open');

    els.drawer.setAttribute(
      'aria-hidden',
      'true'
    );

    document.body.classList.remove(
      'cart-open'
    );

    els.overlay.hidden = true;
  }

  function quoteText() {
    const name =
      $('#customerName').value.trim();

    const dept =
      $('#customerDepartment').value.trim();

    const muni =
      $('#customerMunicipality').value.trim();

    const lines = state.cart.map(i => {
      const p = productByCode(i.codigo);

      return `• ${p.nombre} (${p.codigo}) — Talla ${i.talla} x${i.cantidad} — ${money(
        p.precio * i.cantidad
      )}`;
    });

    const totals = window.hakiTotals(cartTotal(), itemCount(), CONFIG);
    return `${settings().saludoCotizacion}

Nombre: ${name}
Departamento: ${dept}
Municipio: ${muni}

Productos:
${lines.join('\n')}

${settings().subtotalTexto}: ${money(totals.subtotal)}
${settings().envioTexto}: ${totals.free ? settings().gratisTexto : money(totals.shipping)}
${settings().totalTexto}: ${money(totals.total)}`;
  }

  function validateQuote() {
    if (!state.cart.length) {
      showToast(
        'Añade al menos una prenda.'
      );

      return false;
    }

    return els.form.reportValidity();
  }

  function openQuoteLink(url) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function openInstagramChat(handle) {
    const username = String(handle || '').replace(/^@/, '').trim();
    if (!username) return false;

    const encodedUsername = encodeURIComponent(username);
    const webTarget = `https://ig.me/m/${encodedUsername}`;
    const ua = navigator.userAgent || '';
    const isiOS = /iPad|iPhone|iPod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isInstagramBrowser = /Instagram/i.test(ua);

    const openAndroidInstagram = () => {
      location.href = `intent://ig.me/m/${encodedUsername}#Intent;scheme=https;package=com.instagram.android;S.browser_fallback_url=${encodeURIComponent(webTarget)};end`;
    };

    // If the catalog was opened from an Instagram DM, first try to dismiss
    // Instagram's own in-app browser. When the host allows window.close(),
    // this returns to the exact conversation that launched the catalog.
    // If it refuses to close, keep the navigation on the same user gesture
    // and hand control to the native Instagram app instead of instagram.com.
    if (isInstagramBrowser) {
      if (isAndroid) {
        openAndroidInstagram();
        return true;
      }

      if (isiOS) {
        try { window.close(); } catch {}

        if (document.visibilityState !== 'hidden') {
          const appTarget = `instagram://direct?username=${encodedUsername}`;
          location.href = appTarget;

          // The username scheme is app-only and can be rejected by some
          // Instagram builds. Fall back to Meta's ig.me DM link only when the
          // page is still visible, so a successful app handoff is not replaced.
          window.setTimeout(() => {
            if (document.visibilityState !== 'hidden') location.href = webTarget;
          }, 700);
        }
        return true;
      }
    }

    // Android browsers: explicitly target the Instagram package so the DM
    // opens in the installed app, with ig.me as the browser fallback.
    if (isAndroid) {
      openAndroidInstagram();
      return true;
    }

    // Safari/iOS: ig.me is the supported universal DM link and opens the
    // conversation in Instagram when the app accepts the universal link.
    if (isiOS) {
      location.href = webTarget;
      return true;
    }

    window.open(webTarget, '_blank', 'noopener');
    return false;
  }

  function submitInstagram() {
    if (!validateQuote()) return;

    const text = quoteText();
    const handle = String(CONFIG.instagram || 'haki__sv').replace(/^@/, '').trim();
    if (!handle) {
      showToast('Instagram no está configurado.');
      return;
    }

    // Copy synchronously first so iPhone/Safari and Doufu WebViews keep the
    // operation inside the user's tap. Then also use the modern Clipboard API
    // when available. Instagram is opened immediately to avoid popup blocking.
    const legacyCopied = legacyCopyText(text);
    const modernCopy = (navigator.clipboard?.writeText && window.isSecureContext)
      ? navigator.clipboard.writeText(text).then(() => true).catch(() => legacyCopied)
      : Promise.resolve(legacyCopied);

    openInstagramChat(handle);

    modernCopy.then(copied => {
      showToast(copied
        ? 'Cotización copiada. Abriendo Instagram…'
        : 'Abriendo Instagram… Mantén pulsado y pega la cotización.');
    });
  }

  function installQuoteKeyboardGuard() {
    const drawer = els.drawer;
    const form = els.form;
    const viewport = window.visualViewport;
    const mobileQuery = window.matchMedia('(max-width: 800px)');
    if (!drawer || !form || !mobileQuery.matches) return;

    let settleTimer = 0;
    let lateTimer = 0;
    let frame = 0;

    const activeQuoteInput = () => {
      const active = document.activeElement;
      return active?.matches?.('#quoteForm input') ? active : null;
    };

    const viewportMetrics = () => ({
      height: Math.max(280, Math.round(viewport?.height || window.innerHeight)),
      top: Math.max(0, Math.round(viewport?.offsetTop || 0))
    });

    const applyViewport = () => {
      const { height, top } = viewportMetrics();
      drawer.style.setProperty('--haki-vvh', `${height}px`);
      drawer.style.setProperty('--haki-vv-top', `${top}px`);
    };

    const keepFieldVisible = (input = activeQuoteInput(), behavior = 'auto') => {
      if (!input) return;
      const { height, top } = viewportMetrics();
      const rect = input.getBoundingClientRect();
      const safeTop = top + Math.max(18, Math.min(72, height * .14));
      const safeBottom = top + height - Math.max(28, Math.min(110, height * .20));

      if (rect.top >= safeTop && rect.bottom <= safeBottom) return;

      const desiredTop = top + Math.max(18, (height - rect.height) * .36);
      const nextTop = Math.max(0, drawer.scrollTop + rect.top - desiredTop);
      drawer.scrollTo({ top: nextTop, behavior });
    };

    const syncViewport = () => {
      if (!drawer.classList.contains('keyboard-active')) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        applyViewport();
        keepFieldVisible();
      });
    };

    const activateFor = input => {
      drawer.classList.add('keyboard-active');
      applyViewport();

      requestAnimationFrame(() => keepFieldVisible(input));

      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        applyViewport();
        keepFieldVisible(input, 'smooth');
      }, 120);

      clearTimeout(lateTimer);
      lateTimer = setTimeout(() => {
        applyViewport();
        keepFieldVisible(input);
      }, 320);
    };

    document.addEventListener('focusin', event => {
      if (!event.target.matches?.('#quoteForm input')) return;
      activateFor(event.target);
    });

    document.addEventListener('focusout', () => {
      setTimeout(() => {
        if (activeQuoteInput()) return;
        drawer.classList.remove('keyboard-active');
        drawer.style.removeProperty('--haki-vvh');
        drawer.style.removeProperty('--haki-vv-top');
      }, 240);
    });

    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(syncViewport, 120), { passive: true });
  }

  installQuoteKeyboardGuard();

  let toastTimer;

  function showToast(msg) {
    els.toast.textContent = msg;

    els.toast.classList.add('show');

    clearTimeout(toastTimer);

    toastTimer = setTimeout(
      () =>
        els.toast.classList.remove(
          'show'
        ),
      2200
    );
  }

  let searchFrame = 0;
  let pendingSearch = '';
  let searchGridReady = false;

  function setSearchView(active) {
    if (iosCategory) leaveIOSCategory();
    ['homeHero', 'novedades', 'collectionsSection'].forEach(id => {
      const section = document.getElementById(id);
      if (section) section.hidden = active;
    });
    document.body.classList.toggle('search-view', active);
    // Search is its own mode. Never inherit category/collection header rules.
    if (active) document.body.classList.remove('collection-view', 'category-view');
  }

  function ensureSearchGrid() {
    if (searchGridReady && els.products.querySelectorAll('article.product').length === ALL_PRODUCTS.length) return;
    state.category = 'Todos';
    state.collection = null;
    renderProductList(els.products, ALL_PRODUCTS);
    searchGridReady = true;
  }

  function applyLiveSearch(value) {
    const next = String(value || '');
    const query = normalize(next.trim());
    const active = !!query;

    if (detailCode) {
      leaveIOSDetail();
      detailCode = null;
      $('#productDetail').hidden = true;
      $('#catalogo').hidden = false;
      document.body.classList.remove('detail-view');
      history.replaceState(null, '', '#catalogo');
      routedHash = '#catalogo';
      routedEntry = navigationEntry().key;
    }

    state.query = next;
    els.search.value = next;
    $('#desktopSearch').value = next;
    state.category = 'Todos';
    state.collection = null;

    if (!active) {
      setSearchView(false);
      if (searchGridReady) {
        $$('article.product', els.products).forEach(card => { card.hidden = false; });
      }
      els.count.textContent = `${ALL_PRODUCTS.length} productos`;
      els.notice.textContent = '';
      $('#catalogTitle').textContent = 'TODAS LAS PRENDAS';
      return;
    }

    ensureSearchGrid();
    setSearchView(true);
    $('#catalogo').hidden = false;
    $('#catalogTitle').textContent = 'RESULTADOS';

    let visible = 0;
    $$('article.product', els.products).forEach(card => {
      const product = productByCode(card.dataset.code);
      const match = !!product && normalize(
        `${product.codigo || ''} ${product.nombre || ''} ${product.categoria || ''}`
      ).includes(query);
      card.hidden = !match;
      if (match) visible += 1;
    });

    els.count.textContent = `${visible} producto${visible === 1 ? '' : 's'}`;
    els.notice.textContent = visible
      ? `${visible} producto${visible === 1 ? '' : 's'} encontrado${visible === 1 ? '' : 's'}.`
      : 'No hay prendas disponibles en esta búsqueda.';
  }

  function scheduleLiveSearch(value) {
    pendingSearch = String(value || '');
    if (searchFrame) cancelAnimationFrame(searchFrame);
    searchFrame = requestAnimationFrame(() => {
      searchFrame = 0;
      applyLiveSearch(pendingSearch);
    });
  }

  $('#desktopSearch').addEventListener('input', event => {
    els.search.value = event.target.value;
    scheduleLiveSearch(event.target.value);
  });

  els.search.addEventListener('input', event => {
    $('#desktopSearch').value = event.target.value;
    scheduleLiveSearch(event.target.value);
  });

  [$('#desktopSearch'), els.search].forEach(input => {
    input.addEventListener('search', event => scheduleLiveSearch(event.target.value));
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        if (searchFrame) cancelAnimationFrame(searchFrame);
        searchFrame = 0;
        applyLiveSearch(event.target.value);
      }
    });
  });

  els.openCart.addEventListener(
    'click',
    openCart
  );

  els.closeCart.addEventListener(
    'click',
    closeCart
  );

  els.overlay.addEventListener(
    'click',
    closeCart
  );

  document.addEventListener(
    'keydown',
    e => {
      if (e.key === 'Escape') {
        closeCart();
        closeMenu();
        closeSearch();
      }
    }
  );

  els.form.addEventListener(
    'submit',
    submitWhatsApp
  );

  els.igQuote.addEventListener(
    'click',
    submitInstagram
  );

  function setHomeVisible(show) {
    if (iosCategory) return;
    ['homeHero', 'novedades', 'collectionsSection'].forEach(id => { document.getElementById(id).hidden = !show; });
    document.body.classList.toggle('collection-view', !show);
  }

  function renderCollections() {
    $('#collectionsGrid').innerHTML = COLLECTIONS.map(c => {
      const first = ALL_PRODUCTS.find(p => inCollection(p, c));
      const picture = c.imagen || first?.imagen || 'images/producto.svg';
      return `<a class="collection-tile" href="#coleccion/${encodeURIComponent(c.id)}"><div class="collection-image"><img src="${esc(freshImage(picture, 560))}" srcset="${esc(window.hakiSrcset(picture))}" sizes="(max-width:800px) 46vw, 25vw" alt="${esc(c.nombre)}" loading="eager" fetchpriority="low" decoding="async"></div><h3>${esc(c.nombre)}</h3></a>`;
    }).join('');
    $$('#collectionsGrid img').forEach(img => img.addEventListener('error', () => { img.src = freshImage('images/producto.svg'); }, { once: true }));
    const fresh = ALL_PRODUCTS.filter(p => p.novedad === true && hasStock(p));
    renderProductList($('#newProducts'), fresh);
    $('#newEmpty').hidden = fresh.length > 0;
    $('.rail-actions').hidden = !fresh.length;
  }

  function route(event) {
    const previous = routedHash;
    routeCore(event);
    if (previous && previous !== routedHash) {
      window.dispatchEvent(new CustomEvent('haki:app-route', {detail: {
        back: event?.type === 'popstate', hash: routedHash
      }}));
    }
  }

  function routeCore(event) {
    const previousHash = routedHash;
    const currentHash = location.hash || '#top';
    document.body.classList.toggle('category-view', isCategoryHash(currentHash));
    const entry = navigationEntry();
    // A traversal emits both events on mobile browsers. Restore before paint,
    // once per history entry, including separate visits to the same category.
    if (event && currentHash === routedHash && entry.key === routedEntry) return;
    if (event) rememberListing();
    routedHash = currentHash;
    routedEntry = entry.key;
    const restored = listingPositions.get(entry.key);
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { hash = ''; }
    closeMenu(); closeSearch(); $('#sizeGuideDialog').close();
    detailCode = hash.startsWith('producto/') ? hash.slice(9) : null;
    const returningFromIOSDetail = isIOS && !!iosListing && !detailCode &&
      previousHash?.startsWith('#producto/');
    $('#productDetail').hidden = !detailCode && !returningFromIOSDetail;
    document.body.classList.toggle('detail-view', !!detailCode && !isIOS);
    if (isIOS && detailCode) {
      // Keep the listing in layout at its original scroll position, with the
      // same image elements. Only the product sheet has its own scroll offset.
      if (!els.products.childNodes.length) renderProducts();
      enterIOSDetail();
      renderProductDetail(productByCode(detailCode));
      $('#productDetail').scrollTop = 0;
      return;
    }
    if (!returningFromIOSDetail) leaveIOSDetail();
    if (isIOS) {
      if (isCategoryHash(currentHash)) enterIOSCategory(entry.key);
      else leaveIOSCategory();
    }
    $('#catalogo').hidden = !!detailCode;
    if (detailCode) {
      setHomeVisible(false);
      renderProductDetail(productByCode(detailCode));
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    document.title = 'HAKI — Ropa deportiva';
    state.query = ''; els.search.value = ''; $('#desktopSearch').value='';
    state.category = 'Todos'; state.collection = null;
    if (hash.startsWith('categoria/')) state.category = hash.slice(10);
    if (hash.startsWith('coleccion/')) state.collection = COLLECTIONS.find(c => c.id === hash.slice(10)) || null;
    if (restored) {
      state.query = restored.query; els.search.value = restored.query;
      $('#desktopSearch').value = restored.query;
      state.category = restored.category; state.collection = restored.collection;
    }
    const filtered = state.category !== 'Todos' || !!state.collection || !!state.query;
    if (state.query) setSearchView(true);
    else {
      document.body.classList.remove('search-view');
      setHomeVisible(!filtered);
    }
    $('#catalogTitle').textContent = state.query ? 'RESULTADOS' : state.collection?.nombre || (filtered ? state.category : 'TODAS LAS PRENDAS');
    if (returningFromIOSDetail && restored && els.products.childNodes.length) {
      syncCardSelections(els.products);
    } else {
      renderProducts();
    }
    syncCardSelections($('#newProducts'));
    if (iosCategory) {
      iosCategory.scrollTop = restored?.y || 0;
      if (returningFromIOSDetail) leaveIOSDetail();
      return;
    }
    if (restored) {
      if (Math.abs(window.scrollY - restored.y) > 1) {
        if (isIOS) window.scrollTo(0, restored.y);
        else window.scrollTo({ top: restored.y, behavior: 'instant' });
      }
    }
    else if (filtered || hash === 'top' || !hash) {
      if (isIOS) window.scrollTo(0, 0);
      else window.scrollTo({ top: 0, behavior: 'instant' });
    }
    else document.getElementById(hash)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    if (returningFromIOSDetail) leaveIOSDetail();
  }

  function renderProductDetail(p) {
    const detail = $('#productDetail');
    if (!p) {
      detail.innerHTML = '<div class="detail-missing"><a class="back-home haki-chevron-back" href="#catalogo" aria-label="Volver a las prendas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg></a><h1>Prenda no encontrada</h1></div>';
      return;
    }
    document.title = `${p.nombre} — HAKI`;
    const images = [p.imagen || fallbackFor(p), p.imagen2].filter(Boolean);
    const selected = state.selected[p.codigo] || '';
    const sizeGuideType = productSizeGuideType(p);
    const showSizeGuide = !!sizeGuideType;
    detail.innerHTML = `
      <div class="app-detail-toolbar">
        <a class="detail-back" href="${esc(lastListingHash)}" aria-label="Volver a las prendas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg></a>
        <button class="app-detail-cart" type="button" aria-label="Abrir carrito"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/></svg></button>
      </div>
      <div class="detail-layout">
        <div class="detail-media">
          <div id="detailGallery" class="detail-gallery" tabindex="0" aria-label="Fotos de ${esc(p.nombre)}">
            ${images.map((url, i) => `<img src="${esc(freshImage(url,1400))}" data-fallback="${esc(freshImage(fallbackFor(p)))}" alt="${esc(p.nombre)} · Foto ${i + 1}" width="400" height="500" decoding="async" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>`).join('')}
          </div>
          <div class="gallery-controls" ${images.length < 2 ? 'hidden' : ''}>
            <button class="header-icon" type="button" id="galleryPrev" aria-label="Foto anterior">←</button>
            <div class="gallery-dots">${images.map((_, i) => `<button type="button" data-photo="${i}" aria-label="Ver foto ${i + 1}" aria-pressed="${i === 0}"><span></span></button>`).join('')}</div>
            <button class="header-icon" type="button" id="galleryNext" aria-label="Foto siguiente">→</button>
          </div>
        </div>
        <div class="detail-content">
          <div class="detail-summary">
            <div class="app-detail-heading"><div><p class="detail-code">${esc(p.codigo)}</p><h1>${esc(p.nombre)}</h1></div><strong class="detail-price">${money(p.precio)}</strong></div>
            ${p.masVendido === true ? `<span class="app-detail-bestseller">${esc(String(p.etiquetaMasVendido || '').trim() || 'MÁS VENDIDO')}</span>` : ''}
          </div>
          <div class="detail-options">
            ${p.descripcion ? `<p class="detail-description">${esc(p.descripcion)}</p>` : ''}
            <div class="detail-size-heading"><h2>Seleccioná tu talla</h2>${showSizeGuide ? '<button id="openSizeGuide" type="button" class="size-guide-link">Guía de tallas</button>' : ''}</div>
            <div id="detailSizes" class="detail-sizes" role="group" aria-label="Seleccionar talla">
              ${['S','M','L','XL'].map(size => `<button type="button" class="detail-size ${selected === size ? 'selected' : ''}" data-detail-size="${size}" aria-pressed="${selected === size}" ${p.tallas?.[size] ? '' : 'disabled'}>${size}</button>`).join('')}
            </div>
            <p id="detailSizeStatus" class="detail-size-status" role="status">${selected && p.tallas?.[selected] ? `Talla ${selected} seleccionada` : 'Selecciona una talla disponible.'}</p>
            <button class="solid detail-add" type="button">AÑADIR AL CARRITO</button>
          </div>
        </div>
      </div>`;
    $('.app-detail-cart', detail).addEventListener('click', openCart);
    $$('img[data-fallback]', detail).forEach(img => img.addEventListener('error', () => { img.src = img.dataset.fallback; }, { once: true }));
    let photo = 0;
    const gallery = $('#detailGallery');
    function updateDots() { $$('[data-photo]', detail).forEach(btn => btn.setAttribute('aria-pressed', String(Number(btn.dataset.photo) === photo))); }
    function goPhoto(index) { photo = Math.max(0, Math.min(images.length - 1, index)); gallery.scrollTo({ left: photo * gallery.clientWidth, behavior: 'smooth' }); updateDots(); }
    $('#galleryPrev').addEventListener('click', () => goPhoto(photo - 1));
    $('#galleryNext').addEventListener('click', () => goPhoto(photo + 1));
    $$('[data-photo]', detail).forEach(btn => btn.addEventListener('click', () => goPhoto(Number(btn.dataset.photo))));
    gallery.addEventListener('scroll', () => { if (gallery.clientWidth) { photo = Math.round(gallery.scrollLeft / gallery.clientWidth); updateDots(); } }, { passive: true });
    gallery.addEventListener('keydown', e => { if (['ArrowLeft','ArrowRight'].includes(e.key)) { e.preventDefault(); goPhoto(photo + (e.key === 'ArrowRight' ? 1 : -1)); } });
    $$('[data-detail-size]', detail).forEach(btn => btn.addEventListener('click', () => {
      state.selected[p.codigo] = btn.dataset.detailSize;
      $$('[data-detail-size]', detail).forEach(option => {
        const active = option === btn; option.classList.toggle('selected', active); option.setAttribute('aria-pressed', String(active));
      });
      $('#detailSizeStatus').textContent = `Talla ${btn.dataset.detailSize} seleccionada`;
    }));
    $$('.detail-add', detail).forEach(btn => btn.addEventListener('click', () => {
      const size = state.selected[p.codigo];
      if (!size || !p.tallas?.[size]) {
        const available = $('[data-detail-size]:not(:disabled)', detail);
        $('#detailSizeStatus').textContent = available ? 'Seleccioná una talla para añadir la prenda.' : 'Esta prenda está agotada en todas las tallas.';
        $('#detailSizes').scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (available) available.focus({ preventScroll: true });
        return;
      }
      addToCart(p.codigo);
    }));
    if (showSizeGuide) $('#openSizeGuide').addEventListener('click', () => openSizeGuide(sizeGuideType));
  }

  $('#closeSizeGuide').addEventListener('click', () => $('#sizeGuideDialog').close());
  $('#sizeGuideDialog').addEventListener('click', e => { if (e.target === $('#sizeGuideDialog')) $('#sizeGuideDialog').close(); });
  $('#openGlobalSizeGuide').addEventListener('click', () => {
    closeMenu();
    openSizeGuide('compression', true);
  });

  function closeMenu() {
    $('#categoryMenu').close();
    $('#openMenu').setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }
  function closeSearch() {
    $('#searchPanel').hidden = true;
    $('#openSearch').setAttribute('aria-expanded', 'false');
  }
  $('#openMenu').addEventListener('click', () => {
    closeCart(); closeSearch(); $('#categoryMenu').showModal();
    $('#openMenu').setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open');
  });
  $('#closeMenu').addEventListener('click', closeMenu);
  $('#categoryMenu').addEventListener('close', () => { $('#openMenu').setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); });
  $('#categoryMenu').addEventListener('click', e => { if (e.target === $('#categoryMenu')) closeMenu(); });
  $$('#categoryMenu a').forEach(a => a.addEventListener('click', () => { if (a.hash === location.hash) route(); else closeMenu(); }));
  $('#openSearch').addEventListener('click', () => {
    const opening = $('#searchPanel').hidden;
    closeMenu(); $('#searchPanel').hidden = !opening;
    $('#openSearch').setAttribute('aria-expanded', String(opening));
    if (opening) els.search.focus();
  });
  $('#closeSearch').addEventListener('click', () => { closeSearch(); $('#openSearch').focus(); });
  $('.rail-prev').addEventListener('click', () => $('#newProducts').scrollBy({ left: -$('#newProducts').clientWidth * .8, behavior: 'smooth' }));
  $('.rail-next').addEventListener('click', () => $('#newProducts').scrollBy({ left: $('#newProducts').clientWidth * .8, behavior: 'smooth' }));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || els.drawer.getAttribute('aria-hidden') !== 'false') return;
    const items = $$('button:not(:disabled), input, select, summary, a[href]', els.drawer);
    const focusable=items.filter(el=>el.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  function navigateCatalogLink(event) {
    if (event.defaultPrevented || event.button > 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin ||
        destination.pathname !== location.pathname ||
        destination.search !== location.search || !destination.hash) return;
    // Leave the quiz, external destinations and custom controls alone.
    if (!isCatalogHash(destination.hash)) return;
    event.preventDefault();
    const source = navigationEntry();
    const isBack = (link.matches('.back-home') && isCategoryHash(location.hash)) ||
      (link.matches('.detail-back') && !!detailCode);
    if (isBack && source.parent && listingPositions.has(source.parent)) {
      history.back();
      return;
    }
    if (destination.hash === location.hash) return;
    // pushState avoids native fragment scrolling between click and hashchange.
    // Back/Forward still use the normal history stack and the popstate router.
    history.pushState({ hakiNavigation: {
      key: `${navigationSession}-${++entrySequence}`, hash: destination.hash,
      parent: source.key
    } }, '', destination.href);
    route();
  }
  document.addEventListener('click', navigateCatalogLink);

  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);
  const settings=()=>window.hakiSettings(CONFIG);
  let announcementTimer;
  let announcementPaused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let announcementIndex=0;
  function applyExperience(){
    const c=settings();
    document.documentElement.dataset.theme=c.tema==='oscuro'?'oscuro':'claro';
    document.documentElement.style.setProperty('--font-title',c.fuenteTitulos==='Horizon'?'Horizon, Poppins, sans-serif':'Poppins, sans-serif');
    document.documentElement.style.setProperty('--font-body',c.fuenteTexto==='Horizon'?'Horizon, Poppins, sans-serif':'Poppins, sans-serif');
    if(c.horizonUrl&&applyExperience.font!==c.horizonUrl){
      applyExperience.font=c.horizonUrl;
      const font=new FontFace('Horizon',`url(${JSON.stringify(window.hakiSafeLink(c.horizonUrl,''))})`,{display:'swap'});
      font.load().then(f=>document.fonts.add(f)).catch(()=>{});
    }
    const texts={'#cartDrawer .eyebrow':c.carritoAntetitulo,'#cartDrawer .drawer-head h2':c.carritoTitulo,'#cartEmpty strong':c.carritoVacio,'#cartEmpty span':c.carritoAyudaVacio,'#cartNotice':c.carritoAviso,'#shippingInfo':c.envioInformacion,'#recommendationsTitle':c.sugerenciasTitulo,'#recommendationsText':c.sugerenciasTexto,'#orderSummaryTitle':c.resumenTitulo,'#subtotalLabel':c.subtotalTexto,'#shippingLabel':c.envioTexto,'#totalLabel':c.totalTexto,'#quoteForm .form-title':c.datosTitulo,'#nameLabel':c.nombreTexto,'#departmentLabel':c.departamentoTexto,'#municipalityLabel':c.municipioTexto,'#quoteForm .whatsapp':c.whatsappTexto,'#instagramQuote':c.instagramTexto,'#formHelp':c.carritoAyuda};
    Object.entries(texts).forEach(([selector,value])=>{$(selector).textContent=value;});
    $('#cartDrawer').setAttribute('aria-label',c.carritoTitulo);
    [['#customerName',c.nombrePlaceholder],['#customerDepartment',c.departamentoPlaceholder],['#customerMunicipality',c.municipioPlaceholder],['#desktopSearch',c.buscarTexto],['#searchInput',c.buscarTexto]].forEach(([selector,value])=>$(selector).placeholder=value);
    [1,2].forEach(i=>{const b=$('#heroButton'+i),style=String(c[i===1?'estiloBotonPortada':'estiloBotonPortada2']||'').toLowerCase()==='transparente'?'transparente':'blanco';b.textContent=c[i===1?'botonPortada':'botonPortada2'];b.href=window.hakiSafeLink(c[i===1?'enlacePortada':'enlacePortada2']);b.hidden=!b.textContent.trim();b.classList.toggle('solid',style==='blanco');b.classList.toggle('outline',style==='transparente');b.dataset.heroStyle=style;});
    clearInterval(announcementTimer);
    const announcements=[c.anuncio||'Envíos desde $1',c.anuncio2,c.anuncio3].filter(v=>String(v||'').trim());
    announcementIndex=0;$('#announcementText').textContent=announcements[0];
    $('#pauseAnnouncement').textContent=announcementPaused?'▶':'Ⅱ';
    $('#pauseAnnouncement').setAttribute('aria-label',announcementPaused?'Reanudar anuncios':'Pausar anuncios');
    announcementTimer=setInterval(()=>{if(!announcementPaused&&!document.hidden){announcementIndex=(announcementIndex+1)%announcements.length;$('#announcementText').textContent=announcements[announcementIndex];}},5000);
  }
  $('#pauseAnnouncement').addEventListener('click',()=>{announcementPaused=!announcementPaused;applyExperience();});
  function renderShipping(){
    const c=settings(),t=window.hakiTotals(cartTotal(),itemCount(),CONFIG);
    $('#shippingMessage').textContent=t.free?c.envioListo:String(c.envioFalta).replaceAll('{monto}',money(t.remaining));
    $('#shippingProgress').value=t.progress;$('#shippingThreshold').textContent=money(t.threshold);
    $('#cartSubtotal').textContent=money(t.subtotal);$('#shippingAmount').textContent=t.free?c.gratisTexto:money(t.shipping);els.total.textContent=money(t.total);
    const chosen=state.cart.map(i=>productByCode(i.codigo)).filter(Boolean);
    const type=p=>{const v=normalize(p.categoria+' '+p.nombre);return /short|pants|jogger|pantalon|calzoneta/.test(v)?'bottom':/compresion|camis|top|centro|oversized/.test(v)?'top':'other';};
    const complement=p=>chosen.some(q=>(type(q)==='top'&&type(p)==='bottom')||(type(q)==='bottom'&&type(p)==='top'));
    const pool=ALL_PRODUCTS.filter(p=>!chosen.includes(p)&&Object.values(p.tallas||{}).some(Boolean)).sort((a,b)=>a.precio-b.precio);
    // Cheapest option first; then affordable complementary pieces, without duplicates.
    const picks=[pool[0],...pool.filter(complement),...pool].filter(Boolean).filter((p,i,a)=>a.indexOf(p)===i).slice(0,6);
    $('#cartRecommendations').hidden=!chosen.length||t.free||!picks.length;
    $('#recommendationItems').innerHTML=(!chosen.length||t.free?'':picks.map(p=>`<article class="recommendation"><a class="recommendation-media" href="#producto/${encodeURIComponent(p.codigo)}" data-recommend-view><img src="${esc(freshImage(p.imagen,500))}" loading="lazy" decoding="async" alt="${esc(p.nombre)}" width="220" height="275"></a><div class="recommendation-body"><div class="recommendation-heading"><a class="recommendation-name" href="#producto/${encodeURIComponent(p.codigo)}" data-recommend-view>${esc(p.nombre)}</a><strong>${money(p.precio)}</strong></div><span class="recommendation-code">${esc(p.codigo)}</span><div class="recommendation-actions"><select aria-label="${esc(c.sugerenciasTalla+' de '+p.nombre)}" data-recommend-size="${esc(p.codigo)}"><option value="">${esc(c.sugerenciasTalla)}</option>${['S','M','L','XL'].map(size=>`<option ${p.tallas?.[size]?'':'disabled'}>${size}</option>`).join('')}</select><button type="button" data-recommend-add="${esc(p.codigo)}" disabled>+ ${esc(c.sugerenciasAgregar)}</button></div></div></article>`).join(''));
    $$('[data-recommend-size]').forEach(select=>select.addEventListener('change',()=>{$('[data-recommend-add]',select.closest('article')).disabled=!select.value;}));
    $$('[data-recommend-add]').forEach(btn=>btn.addEventListener('click',()=>{const select=$('select',btn.closest('article'));state.selected[btn.dataset.recommendAdd]=select.value;addToCart(btn.dataset.recommendAdd);}));
    $$('[data-recommend-view]').forEach(a=>a.addEventListener('click',closeCart));
  }
  function setupZoom(gallery){
    const media=gallery.parentElement;
    const button=document.createElement('button');button.type='button';button.className='gallery-zoom';button.textContent='+';button.setAttribute('aria-label','Ampliar imagen');button.setAttribute('aria-pressed','false');media.append(button);
    let zoom=false;
    const reset=()=>{$$('img',gallery).forEach(img=>{img.style.transform='';img.style.transformOrigin='';});};
    const toggle=()=>{zoom=!zoom;gallery.classList.toggle('zoomed',zoom);button.textContent=zoom?'−':'+';button.setAttribute('aria-label',zoom?'Reducir imagen':'Ampliar imagen');button.setAttribute('aria-pressed',String(zoom));reset();if(zoom){const i=Math.round(gallery.scrollLeft/gallery.clientWidth);$$('img',gallery)[i].style.transform='scale(2)';}};
    button.addEventListener('click',toggle);
    gallery.addEventListener('dblclick',toggle);
    gallery.addEventListener('pointermove',e=>{if(!zoom)return;const rect=gallery.getBoundingClientRect();const img=$$('img',gallery)[Math.round(gallery.scrollLeft/gallery.clientWidth)];img.style.transformOrigin=`${Math.max(0,Math.min(100,(e.clientX-rect.left)/rect.width*100))}% ${Math.max(0,Math.min(100,(e.clientY-rect.top)/rect.height*100))}%`;});
    gallery.addEventListener('scroll',()=>{if(zoom){zoom=false;gallery.classList.remove('zoomed');button.textContent='+';button.setAttribute('aria-label','Ampliar imagen');button.setAttribute('aria-pressed','false');reset();}},{passive:true});
    gallery.addEventListener('keydown',e=>{if(e.key==='Escape'&&zoom)toggle();});
  }
  function reconcileCart(){state.cart=state.cart.filter(i=>{const p=productByCode(i.codigo);return p&&p.tallas?.[i.talla]&&Number.isInteger(i.cantidad)&&i.cantidad>0;});saveCart();}
  window.addEventListener('haki:catalog-updated',()=>{
    Object.keys(CONFIG).forEach(k=>delete CONFIG[k]);Object.assign(CONFIG,window.HAKI_CONFIG);
    ALL_PRODUCTS.splice(0,ALL_PRODUCTS.length,...window.HAKI_PRODUCTOS.filter(p => p.borrador !== true));COLLECTIONS.splice(0,COLLECTIONS.length,...window.hakiCollections(CONFIG));
    searchGridReady=false;
    reconcileCart();applyConfig();renderCollections();renderProducts();
    if(state.query) applyLiveSearch(state.query);
    if(detailCode)renderProductDetail(productByCode(detailCode));renderCart();
  });
  reconcileCart();
  applyConfig();
  renderCollections();
  route();
  renderCart();
})();
