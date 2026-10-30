(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'inventory-editor-dialog';
  dialog.setAttribute('aria-labelledby', 'inventoryEditorTitle');
  dialog.innerHTML = '<header class="inventory-editor-head"><h2 id="inventoryEditorTitle">Editar prenda</h2><button type="button" class="round" aria-label="Cerrar editor de prenda">×</button></header><iframe title="Editor de prenda HAKI"></iframe>';
  document.body.append(dialog);
  const frame = dialog.querySelector('iframe');
  let activeProduct = null;
  let returnFocus = null;
  let previousOverflow = '';
  let dirty = false;
  let busy = false;

  function close() {
    if (busy) return;
    if (dirty && !confirm('¿Cerrar el editor sin guardar los cambios pendientes?')) return;
    dialog.close();
  }
  dialog.querySelector('button').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    frame.removeAttribute('src');
    const target = document.querySelector(`#inventoryList [data-product-id="${CSS.escape(String(activeProduct.id))}"] .inventory-edit`);
    (target || returnFocus)?.focus({ preventScroll: true });
    activeProduct = null;
    dirty = false;
  });

  window.HAKIInventoryEditor = {
    open(product, trigger) {
      if (dialog.open || inventorySaving) return;
      activeProduct = product;
      returnFocus = trigger;
      dirty = false;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.querySelector('h2').textContent = `Editar ${product.nombre}`;
      frame.src = `index.html?panel=1&inventoryEditor=1&product=${encodeURIComponent(product.id)}`;
      dialog.showModal();
    },
    snapshot(productId) {
      if (String(activeProduct?.id) !== String(productId)) throw new Error('No se encontró la prenda seleccionada.');
      const draft = inventoryDrafts.get(String(productId));
      return {
        stock: { ...(draft?.stock || stockFor(productId)) },
        expectedStock: { ...(draft?.expectedStock || stockFor(productId)) }
      };
    },
    changed() { dirty = true; },
    setBusy(value) {
      busy = value;
      dialog.querySelector('button').disabled = value;
    },
    async saveStock(product, stock, expectedStock) {
      const pid = String(product.id);
      if (pid !== String(activeProduct?.id)) throw new Error('La prenda seleccionada cambió. Vuelve a abrir el editor.');
      if (inventorySizes.some(size => Number(stock[size]) !== Number(expectedStock[size]))) {
        const update = { productId: product.id, productCode: product.codigo, stock, expectedStock };
        const data = await api('sales?mode=inventory', { method: 'PUT', body: JSON.stringify({ updates: [update] }) });
        state.inventory = data.inventory;
        Object.assign(expectedStock, stock);
      }
      inventoryDrafts.delete(pid);
      // Keep drafts for other garments, including their concurrency baselines.
      await loadProducts();
      dirty = false;
      busy = false;
      dialog.close();
      toast('Prenda guardada');
    }
  };
})();
