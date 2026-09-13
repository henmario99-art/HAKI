(() => {
  const CONFIG = window.HAKI_CONFIG || {};
  const ALL_PRODUCTS = window.HAKI_PRODUCTOS || [];
  const COLLECTIONS = window.hakiCollections(CONFIG);

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const freshImage = (url, size=800) => window.hakiImage(url,size);
  let detailCode = null;
  let lastListingHash = '#top';
  const listingPositions = new Map();

  const state = {
    query: '',
    category: 'Todos',
    collection: null,
    color: '',
    size: '',
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

    const title = (CONFIG.frase || 'NO HAY LÍMITES.').replace(' ', '<br>');

    $('#heroTitle').innerHTML = title.includes('LÍMITES')
      ? 'NO HAY<br>LÍMITES.'
      : esc(CONFIG.frase || 'NO HAY LÍMITES.');

    $('#heroDescription').textContent =
      CONFIG.subfrase ||
      'Tu esfuerzo. Tu ritmo. Tu Haki. Ropa deportiva para darlo todo.';

    const hero = $('#heroImage');

    hero.src = freshImage(
      CONFIG.portada || CONFIG.portadaRespaldo, 1920
    );
    hero.srcset = window.hakiSrcset(CONFIG.portada); hero.sizes="100vw";

    hero.onerror = () => {
      hero.onerror = null;

      hero.src = freshImage(
        CONFIG.portadaRespaldo || 'images/hero-fallback.svg'
      );
    };

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
        (state.category === 'Todos' ||
          normalize(p.categoria || '') === normalize(state.category)) &&
        (!state.collection || inCollection(p, state.collection)) &&
        (!state.color || (Array.isArray(p.colores) ? p.colores : p.color ? [p.color] : [])
          .some(color => normalize(color) === normalize(state.color))) &&
        (!state.size || !!p.tallas?.[state.size]) &&
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

  function usesShirtSizeTable(p) {
    const collectionNames = (p.colecciones || [])
      .map(id => COLLECTIONS.find(collection => collection.id === id)?.nombre || '')
      .join(' ');
    return /camiseta|centro/.test(normalize(`${p.categoria || ''} ${collectionNames}`));
  }

  function shirtSizeTable() {
    return `<section class="inline-size-guide" aria-labelledby="inlineSizeGuideTitle">
      <h2 id="inlineSizeGuideTitle">Guía de tallas</h2>
      <div class="inline-size-guide-scroll">
        <table>
          <thead><tr><th scope="col">Talla USA</th><th scope="col">Pecho (cm)</th><th scope="col">Hombro (cm)</th><th scope="col">Largo (cm)</th></tr></thead>
          <tbody>
            <tr><th scope="row">S</th><td>84–88</td><td>39</td><td>60</td></tr>
            <tr><th scope="row">M</th><td>88–92</td><td>40</td><td>61</td></tr>
            <tr><th scope="row">L</th><td>89–105</td><td>41</td><td>62</td></tr>
            <tr><th scope="row">XL</th><td>93–112</td><td>43</td><td>64</td></tr>
          </tbody>
        </table>
      </div>
    </section>`;
  }

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
    container.innerHTML = list
      .map(p => {
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
                src="${esc(freshImage(p.imagen))}"
                data-fallback="${esc(
                  freshImage(fallbackFor(p))
                )}"
                alt="${esc(p.nombre)}"
                loading="lazy" decoding="async" width="400" height="500" srcset="${esc(window.hakiSrcset(p.imagen))}" sizes="(max-width:800px) 50vw, 25vw"
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
                ${selected ? '' : 'disabled'}
                aria-label="Añadir ${esc(p.nombre)}"
              >
                +
              </button>

            </div>

          </article>
        `;
      })
      .join('');

    $$('.product-detail-link', container).forEach(link => link.addEventListener('click', () => {
      lastListingHash = location.hash || '#top';
      listingPositions.set(lastListingHash, { y: window.scrollY, query: state.query, category: state.category, collection: state.collection, color: state.color, size: state.size });
    }));

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
          });
        })
    );

    $$('[data-add]', container).forEach(btn =>
      btn.addEventListener('click', () =>
        addToCart(btn.dataset.add)
      )
    );
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

  function submitWhatsApp(e) {
    e.preventDefault();

    if (!validateQuote()) return;

    window.open(
      `https://wa.me/${
        CONFIG.whatsapp
      }?text=${encodeURIComponent(
        quoteText()
      )}`,
      '_blank',
      'noopener'
    );
  }

  async function submitInstagram() {
    if (!validateQuote()) return;

    const text = quoteText();

    try {
      await navigator.clipboard.writeText(
        text
      );

      showToast(
        'Cotización copiada. Pégala en Instagram.'
      );
    } catch {
      showToast(
        'Abriendo Instagram. Copia la cotización manualmente.'
      );
    }

    window.open(
      `https://ig.me/m/${encodeURIComponent(String(CONFIG.instagram || '').replace(/^@/,''))}`,
      '_blank',
      'noopener'
    );
  }

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

  $('#desktopSearch').addEventListener('input', e=>{els.search.value=e.target.value;els.search.dispatchEvent(new Event('input'));});
  els.search.addEventListener(
    'input',
    e => {
      if (detailCode) {
        detailCode = null;
        $('#productDetail').hidden = true; $('#catalogo').hidden = false;
        document.body.classList.remove('detail-view');
        history.replaceState(null, '', '#catalogo');
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      state.query = e.target.value; $('#desktopSearch').value=state.query;
      state.category = 'Todos'; state.collection = null;
      setHomeVisible(!state.query);
      if (state.query) window.scrollTo({ top: 0, behavior: 'instant' });
      $('#catalogTitle').textContent = state.query ? 'RESULTADOS' : 'TODAS LAS PRENDAS';
      renderProducts();
    }
  );

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
    ['homeHero', 'novedades', 'collectionsSection'].forEach(id => { document.getElementById(id).hidden = !show; });
    document.body.classList.toggle('collection-view', !show);
  }

  function renderCollections() {
    $('#collectionsGrid').innerHTML = COLLECTIONS.map(c => {
      const first = ALL_PRODUCTS.find(p => inCollection(p, c));
      const picture = c.imagen || first?.imagen || 'images/producto.svg';
      return `<a class="collection-tile" href="#coleccion/${encodeURIComponent(c.id)}"><div class="collection-image"><img src="${esc(freshImage(picture))}" alt="${esc(c.nombre)}" loading="lazy"></div><h3>${esc(c.nombre)}</h3></a>`;
    }).join('');
    $$('#collectionsGrid img').forEach(img => img.addEventListener('error', () => { img.src = freshImage('images/producto.svg'); }, { once: true }));
    const fresh = ALL_PRODUCTS.filter(p => p.novedad === true);
    renderProductList($('#newProducts'), fresh);
    $('#newEmpty').hidden = fresh.length > 0;
    $('.rail-actions').hidden = !fresh.length;
  }

  function route() {
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { hash = ''; }
    closeMenu(); closeSearch(); $('#sizeGuideDialog').close();
    detailCode = hash.startsWith('producto/') ? hash.slice(9) : null;
    $('#productDetail').hidden = !detailCode;
    $('#catalogo').hidden = !!detailCode;
    document.body.classList.toggle('detail-view', !!detailCode);
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
    const restored = listingPositions.get(location.hash || '#top');
    if (restored) {
      state.query = restored.query; els.search.value = restored.query;
      state.category = restored.category; state.collection = restored.collection;
      state.color = restored.color || ''; state.size = restored.size || '';
      listingPositions.delete(location.hash || '#top');
    }
    const filtered = state.category !== 'Todos' || !!state.collection || !!state.query || !!state.color || !!state.size;
    setHomeVisible(!filtered);
    $('#catalogTitle').textContent = state.query ? 'RESULTADOS' : state.collection?.nombre || ((state.color || state.size) ? 'PRENDAS FILTRADAS' : (filtered ? state.category : 'TODAS LAS PRENDAS'));
    renderProducts();
    if (restored) requestAnimationFrame(() => window.scrollTo({ top: restored.y, behavior: 'instant' }));
    else if (filtered || hash === 'top' || !hash) window.scrollTo({ top: 0, behavior: 'instant' });
    else if (hash === 'catalogo') els.products.closest('section').scrollIntoView();
  }

  function renderProductDetail(p) {
    const detail = $('#productDetail');
    if (!p) {
      detail.innerHTML = '<div class="detail-missing"><h1>Prenda no encontrada</h1><a href="#catalogo">Volver al catálogo</a></div>';
      return;
    }
    document.title = `${p.nombre} — HAKI`;
    const images = [p.imagen || fallbackFor(p), p.imagen2].filter(Boolean);
    const selected = state.selected[p.codigo] || '';
    const showShirtSizeTable = usesShirtSizeTable(p);
    detail.innerHTML = `
      <a class="detail-back" href="${esc(lastListingHash)}">← Volver a las prendas</a>
      <div class="detail-layout">
        <div class="detail-media">
          <div id="detailGallery" class="detail-gallery" tabindex="0" aria-label="Fotos de ${esc(p.nombre)}">
            ${images.map((url, i) => `<img src="${esc(freshImage(url,1400))}" data-fallback="${esc(freshImage(fallbackFor(p)))}" alt="${esc(p.nombre)} · Foto ${i + 1}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>`).join('')}
          </div>
          <div class="gallery-controls" ${images.length < 2 ? 'hidden' : ''}>
            <button class="header-icon" type="button" id="galleryPrev" aria-label="Foto anterior">←</button>
            <div class="gallery-dots">${images.map((_, i) => `<button type="button" data-photo="${i}" aria-label="Ver foto ${i + 1}" aria-pressed="${i === 0}"><span></span></button>`).join('')}</div>
            <button class="header-icon" type="button" id="galleryNext" aria-label="Foto siguiente">→</button>
          </div>
          ${p.masVendido === true ? `<span class="best-seller-badge detail-best-seller">${esc(String(p.etiquetaMasVendido || '').trim() || 'MÁS VENDIDO')}</span>` : ''}
        </div>
        <div class="detail-content">
          <div class="detail-summary">
            ${p.novedad ? '<span class="detail-new">NUEVO</span>' : ''}
            <h1>${esc(p.nombre)}</h1>
            <p class="detail-code">${esc(p.codigo)}</p>
            <button class="solid detail-add" type="button">AÑADIR AL CARRITO</button>
          </div>
          <div class="detail-options">
            <strong class="detail-price">${money(p.precio)}</strong>
            ${p.descripcion ? `<p class="detail-description">${esc(p.descripcion)}</p>` : ''}
            <div class="detail-size-heading"><h2>Seleccioná tu talla</h2>${p.guiaTallas && !showShirtSizeTable ? '<button id="openSizeGuide" type="button" class="size-guide-link">Guía de tallas</button>' : ''}</div>
            <div id="detailSizes" class="detail-sizes" role="group" aria-label="Seleccionar talla">
              ${['S','M','L','XL'].map(size => `<button type="button" class="detail-size ${selected === size ? 'selected' : ''}" data-detail-size="${size}" aria-pressed="${selected === size}" ${p.tallas?.[size] ? '' : 'disabled'}>${size}</button>`).join('')}
            </div>
            <p id="detailSizeStatus" class="detail-size-status" role="status">${selected && p.tallas?.[selected] ? `Talla ${selected} seleccionada` : ''}</p>
            <button class="solid detail-add" type="button">AÑADIR AL CARRITO</button>
            ${showShirtSizeTable ? shirtSizeTable() : ''}
          </div>
        </div>
      </div>`;
    $$('img[data-fallback]', detail).forEach(img => img.addEventListener('error', () => { img.src = img.dataset.fallback; }, { once: true }));
    let photo = 0;
    const gallery = $('#detailGallery');
    setupZoom(gallery);
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
    if (p.guiaTallas && !showShirtSizeTable) $('#openSizeGuide').addEventListener('click', () => {
      $('#sizeGuideImage').src = freshImage(p.guiaTallas);
      $('#sizeGuideDialog').showModal();
    });
  }

  $('#closeSizeGuide').addEventListener('click', () => $('#sizeGuideDialog').close());
  $('#sizeGuideDialog').addEventListener('click', e => { if (e.target === $('#sizeGuideDialog')) $('#sizeGuideDialog').close(); });

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
  window.addEventListener('hashchange', route);
  window.addEventListener('haki:catalog-filter-change', event => {
    const detail = event.detail || {};
    if (detail.clear) {
      state.color = '';
      state.size = '';
    } else if (detail.type === 'color') {
      state.color = state.color === detail.value ? '' : detail.value;
    } else if (detail.type === 'size') {
      state.size = state.size === detail.value ? '' : detail.value;
    }
    window.dispatchEvent(new CustomEvent('haki:catalog-filter-state', { detail: { color: state.color, size: state.size } }));
    if (location.hash !== '#catalogo') location.hash = '#catalogo';
    else {
      setHomeVisible(false);
      $('#catalogTitle').textContent = state.color || state.size ? 'PRENDAS FILTRADAS' : 'TODAS LAS PRENDAS';
      renderProducts();
    }
  });

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
    $('#recommendationItems').innerHTML=(!chosen.length||t.free?'':picks.map(p=>`<article class="recommendation"><a href="#producto/${encodeURIComponent(p.codigo)}" data-recommend-view><img src="${esc(freshImage(p.imagen,400))}" loading="lazy" decoding="async" alt="${esc(p.nombre)}" width="72" height="90"></a><div><a class="recommendation-name" href="#producto/${encodeURIComponent(p.codigo)}" data-recommend-view>${esc(p.nombre)}</a><strong>${money(p.precio)}</strong><div class="recommendation-actions"><select aria-label="${esc(c.sugerenciasTalla+' de '+p.nombre)}" data-recommend-size="${esc(p.codigo)}"><option value="">${esc(c.sugerenciasTalla)}</option>${['S','M','L','XL'].map(size=>`<option ${p.tallas?.[size]?'':'disabled'}>${size}</option>`).join('')}</select><button type="button" data-recommend-add="${esc(p.codigo)}" disabled>+ ${esc(c.sugerenciasAgregar)}</button></div></div></article>`).join(''));
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
    ALL_PRODUCTS.splice(0,ALL_PRODUCTS.length,...window.HAKI_PRODUCTOS);COLLECTIONS.splice(0,COLLECTIONS.length,...window.hakiCollections(CONFIG));
    reconcileCart();applyConfig();renderCollections();renderProducts();if(detailCode)renderProductDetail(productByCode(detailCode));renderCart();
  });
  reconcileCart();
  applyConfig();
  renderCollections();
  route();
  renderCart();
})();
