(() => {
  const CONFIG = window.HAKI_CONFIG || {};
  const ALL_PRODUCTS = window.HAKI_PRODUCTOS || [];

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const IMAGE_VERSION = Date.now();

  function freshImage(url = '') {
    if (!url) return '';

    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    ) {
      return url;
    }

    return `${url}${url.includes('?') ? '&' : '?'}v=${IMAGE_VERSION}`;
  }

  const state = {
    query: '',
    category: 'Todos',
    selected: {},
    cart: loadCart()
  };

  const els = {
    products: $('#products'),
    count: $('#productCount'),
    search: $('#searchInput'),
    filters: $('#filters'),
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
    localStorage.setItem('haki_cart_v1', JSON.stringify(state.cart));
  }

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem('haki_cart_v1')) || [];
    } catch {
      return [];
    }
  }

  function productByCode(code) {
    return ALL_PRODUCTS.find(p => p.codigo === code);
  }

  function applyConfig() {
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
      CONFIG.portada || CONFIG.portadaRespaldo
    );

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

    $('#year').textContent = new Date().getFullYear();
  }

  function categories() {
    return [
      'Todos',
      ...new Set(
        ALL_PRODUCTS.map(p => p.categoria).filter(Boolean)
      )
    ];
  }

  function renderFilters() {
    els.filters.innerHTML = categories()
      .map(
        c => `
        <button
          class="filter-btn ${
            c === state.category ? 'active' : ''
          }"
          type="button"
          data-category="${esc(c)}"
        >
          ${esc(c)}
        </button>
      `
      )
      .join('');

    $$('.filter-btn', els.filters).forEach(btn =>
      btn.addEventListener('click', () => {
        state.category = btn.dataset.category;

        renderFilters();
        renderProducts();
      })
    );
  }

  function visibleProducts() {
    const q = normalize(state.query.trim());

    return ALL_PRODUCTS.filter(
      p =>
        (state.category === 'Todos' ||
          p.categoria === state.category) &&
        (!q ||
          normalize(
            `${p.codigo} ${p.nombre} ${p.categoria}`
          ).includes(q))
    );
  }

  function renderProducts() {
    const list = visibleProducts();

    els.count.textContent = `${ALL_PRODUCTS.length} productos`;

    els.notice.textContent =
      list.length === ALL_PRODUCTS.length
        ? ''
        : `${list.length} producto${
            list.length === 1 ? '' : 's'
          } encontrado${list.length === 1 ? '' : 's'}.`;

    els.products.innerHTML = list
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

            <div class="product-image">

              <img
                src="${esc(freshImage(p.imagen))}"
                data-fallback="${esc(
                  freshImage(fallbackFor(p))
                )}"
                alt="${esc(p.nombre)}"
                loading="lazy"
              >

              <span class="product-number">
                ${String(p.id).padStart(2, '0')}
              </span>

            </div>

            <div class="product-info">

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

            </div>

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

    $$('img[data-fallback]', els.products).forEach(img =>
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

    $$('.size-option:not(:disabled)', els.products).forEach(
      btn =>
        btn.addEventListener('click', () => {
          state.selected[btn.dataset.code] =
            btn.dataset.size;

          renderProducts();
        })
    );

    $$('[data-add]', els.products).forEach(btn =>
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

    els.total.textContent =
      money(cartTotal());

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
                ELIMINAR
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
    els.drawer.classList.remove('open');

    els.drawer.setAttribute(
      'aria-hidden',
      'true'
    );

    document.body.classList.remove(
      'cart-open'
    );

    setTimeout(() => {
      els.overlay.hidden = true;
    }, 300);
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

    return `Hola HAKI 👋
Quiero solicitar una cotización.

Nombre: ${name}
Departamento: ${dept}
Municipio: ${muni}

Productos:
${lines.join('\n')}

Total estimado: ${money(cartTotal())}`;
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
      `https://www.instagram.com/${
        CONFIG.instagram
      }/`,
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

  els.search.addEventListener(
    'input',
    e => {
      state.query = e.target.value;

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

  applyConfig();
  renderFilters();
  renderProducts();
  renderCart();
})();
