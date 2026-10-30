(() => {
  if (!inventoryEditorProductId || window.parent === window) return;
  const bridge = window.parent.HAKIInventoryEditor;
  if (!bridge) return;
  document.body.classList.add('inventory-product-editor');
  const save = document.getElementById('saveBtn');
  save.textContent = 'Guardar prenda';
  let product = null;
  let expectedStock = null;
  let stockFields = [];

  const originalRender = renderProducts;
  renderProducts = function(options) {
    originalRender(options);
    const card = document.querySelector('#products .product-card');
    product = state.products.find(p => String(p.id) === inventoryEditorProductId);
    if (!card || !product) {
      document.getElementById('products').textContent = 'Esta prenda ya no está en el catálogo. Cierra el editor y actualiza el inventario.';
      return;
    }
    const toggle = card.querySelector('.product-toggle');
    if (toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
    const more = card.querySelector('.more-product');
    if (more.getAttribute('aria-expanded') !== 'true') more.click();
    const basic = card.querySelector('.product-basic');
    const nameLabel = document.createElement('label');
    nameLabel.className = 'inventory-product-name';
    nameLabel.textContent = 'Nombre de la prenda';
    const name = document.createElement('input');
    name.value = product.nombre;
    name.required = true;
    name.addEventListener('input', () => {
      product.nombre = name.value;
      card.querySelector('.product-title').textContent = name.value || 'Sin nombre';
    });
    nameLabel.append(name);
    basic.prepend(nameLabel);
    const snapshot = bridge.snapshot(product.id);
    expectedStock = snapshot.expectedStock;
    const sizes = document.createElement('fieldset');
    sizes.className = 'inventory-editor-sizes';
    sizes.innerHTML = '<legend>Inventario por talla</legend><p>Las tallas con existencias aparecerán disponibles en el catálogo.</p><div></div>';
    stockFields = ['S', 'M', 'L', 'XL'].map(size => {
      const label = document.createElement('label');
      label.textContent = size;
      const input = document.createElement('input');
      input.type = 'number'; input.min = '0'; input.step = '1'; input.required = true;
      input.inputMode = 'numeric'; input.value = snapshot.stock[size] ?? 0;
      input.dataset.editorStock = size;
      input.setAttribute('aria-label', `Existencias talla ${size}`);
      label.append(input); sizes.querySelector('div').append(label);
      return input;
    });
    basic.after(sizes);
  };
  document.getElementById('products').addEventListener('input', () => bridge.changed());
  document.getElementById('products').addEventListener('change', () => bridge.changed());
  document.getElementById('products').addEventListener('click', event => {
    if (event.target.closest('.remove-photo, [data-clear-image]')) bridge.changed();
  });
  // Uploads mutate the garment after their asynchronous request completes.
  const originalApi = api;
  api = async function(path, options) {
    if (path === 'upload') bridge.setBusy(true);
    try {
      const result = await originalApi(path, options);
      if (path === 'upload') bridge.changed();
      return result;
    } finally {
      if (path === 'upload') bridge.setBusy(false);
    }
  };
  window.HAKIProductEditor = {
    validate() {
      if (!product || !expectedStock) { toast('La prenda no está lista para guardar.'); return false; }
      const fields = document.querySelectorAll('#products input:not([type=file]), #products textarea, #products select');
      for (const input of fields) if (!input.reportValidity()) return false;
      if (!product.nombre.trim() || !product.codigo.trim()) { toast('Escribe el nombre y el código de la prenda.'); return false; }
      bridge.setBusy(true);
      return true;
    },
    async saved() {
      try {
        const stock = Object.fromEntries(stockFields.map(input => [input.dataset.editorStock, Number(input.value)]));
        await bridge.saveStock(product, stock, expectedStock);
      } catch (error) {
        throw new Error(`Los datos de la prenda se guardaron. ${error.message} Revisa el inventario antes de volver a guardar.`);
      }
    },
    finished() { bridge.setBusy(false); }
  };
  if (state.products.length) renderProducts();
})();
