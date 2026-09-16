(() => {
  const items = document.querySelector('#items');
  if (!items) return;

  let activeSelect = null;

  function imageUrl(product) {
    const value = String(product?.imagen || product?.imagenRespaldo || 'images/producto.svg').trim();
    if (!value) return '/images/producto.svg';
    if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith('/')) return value;
    return `/${value.replace(/^\.\//, '')}`;
  }

  function productFor(select) {
    return state.products.find(product => String(product.id) === String(select.value)) || null;
  }

  function makeThumb(product, className = '') {
    const img = document.createElement('img');
    img.className = className;
    img.alt = product ? product.nombre || product.codigo || 'Prenda HAKI' : '';
    if (product) {
      img.src = imageUrl(product);
      img.loading = 'lazy';
      img.onerror = () => {
        const fallback = String(product.imagenRespaldo || 'images/producto.svg');
        const next = fallback.startsWith('/') ? fallback : `/${fallback.replace(/^\.\//, '')}`;
        if (img.src !== new URL(next, location.origin).href) img.src = next;
      };
    }
    return img;
  }

  const overlay = document.createElement('div');
  overlay.className = 'product-picker-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="product-picker-sheet" role="dialog" aria-modal="true" aria-label="Seleccionar prenda">
      <header class="product-picker-head">
        <h2>Seleccionar prenda</h2>
        <button class="product-picker-close" type="button" aria-label="Cerrar">×</button>
      </header>
      <input class="product-picker-search" type="search" placeholder="Buscar por nombre o código" autocomplete="off">
      <div class="product-picker-list"></div>
    </section>`;
  document.body.append(overlay);

  const search = overlay.querySelector('.product-picker-search');
  const list = overlay.querySelector('.product-picker-list');

  function closePicker() {
    overlay.hidden = true;
    document.body.style.removeProperty('overflow');
    activeSelect = null;
  }

  function renderProducts() {
    const query = (search.value || '').trim().toLowerCase();
    const products = state.products.filter(product => {
      if (!query) return true;
      return `${product.codigo || ''} ${product.nombre || ''}`.toLowerCase().includes(query);
    });

    list.replaceChildren();
    if (!products.length) {
      const empty = document.createElement('div');
      empty.className = 'product-picker-empty';
      empty.textContent = 'No se encontraron prendas.';
      list.append(empty);
      return;
    }

    products.forEach(product => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'product-picker-option';
      const thumb = makeThumb(product);
      const copy = document.createElement('div');
      const name = document.createElement('strong');
      const code = document.createElement('small');
      const price = document.createElement('span');
      name.textContent = product.nombre || 'Sin nombre';
      code.textContent = product.codigo || '';
      price.className = 'product-picker-price';
      price.textContent = money(product.precio || 0);
      copy.append(name, code);
      button.append(thumb, copy, price);
      button.addEventListener('click', () => {
        if (!activeSelect) return closePicker();
        activeSelect.value = String(product.id);
        activeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        syncVisualButton(activeSelect);
        closePicker();
      });
      list.append(button);
    });
  }

  function openPicker(select) {
    activeSelect = select;
    search.value = '';
    renderProducts();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => search.focus({ preventScroll: true }));
  }

  function syncVisualButton(select) {
    const button = select.closest('.item-product')?.querySelector('.product-picker-button');
    if (!button) return;
    const product = productFor(select);
    const oldImage = button.querySelector('img');
    const oldEmpty = button.querySelector('.product-picker-thumb.is-empty');
    if (oldImage) oldImage.remove();
    if (oldEmpty) oldEmpty.remove();

    let visual;
    if (product) {
      visual = makeThumb(product, 'product-picker-thumb');
    } else {
      visual = document.createElement('span');
      visual.className = 'product-picker-thumb is-empty';
      visual.textContent = 'FOTO';
    }
    button.prepend(visual);

    const title = button.querySelector('[data-picker-title]');
    const meta = button.querySelector('[data-picker-meta]');
    title.textContent = product ? product.nombre : 'Selecciona una prenda';
    meta.textContent = product ? `${product.codigo || ''} · ${money(product.precio || 0)}` : 'Toca para ver las prendas con foto';
  }

  function enhanceRow(row) {
    if (!row || row.dataset.visualPicker === '1') return;
    const label = row.querySelector('.item-product');
    const select = row.querySelector('[data-item="product"]');
    if (!label || !select) return;
    row.dataset.visualPicker = '1';
    select.classList.add('native-product-select');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'product-picker-button';
    button.innerHTML = `
      <span class="product-picker-thumb is-empty">FOTO</span>
      <span class="product-picker-copy">
        <strong data-picker-title>Selecciona una prenda</strong>
        <span data-picker-meta>Toca para ver las prendas con foto</span>
      </span>
      <span class="product-picker-chevron">›</span>`;
    button.addEventListener('click', () => openPicker(select));
    select.insertAdjacentElement('afterend', button);
    select.addEventListener('change', () => syncVisualButton(select));
    syncVisualButton(select);
  }

  function enhanceAll() {
    items.querySelectorAll('.item-row').forEach(enhanceRow);
  }

  search.addEventListener('input', renderProducts);
  overlay.querySelector('.product-picker-close').addEventListener('click', closePicker);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closePicker();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !overlay.hidden) closePicker();
  });

  new MutationObserver(enhanceAll).observe(items, { childList: true });
  enhanceAll();
})();
