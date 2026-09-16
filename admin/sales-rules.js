// Reglas de negocio del registro de ventas HAKI.
// - Pedido Express: $1 por prenda.
// - C807: $4.00 si ya estaba pagado, $4.50 si es cobro pendiente/contra entrega.
// - El envío automático siempre puede editarse manualmente.
// - El total mostrado descuenta la comisión C807.
// - Inventario y resumen muestran foto/destino.
(() => {
  const shippingInput = document.querySelector('#saleShipping');
  const deliverySelect = document.querySelector('#saleDelivery');
  const moneySelect = document.querySelector('#saleMoney');
  const items = document.querySelector('#items');
  if (!shippingInput || !deliverySelect || !moneySelect || !items) return;

  state.shippingManual = false;

  function productImage(product) {
    const value = String(product?.imagen || product?.imagenRespaldo || 'images/producto.svg').trim();
    if (!value) return '/images/producto.svg';
    if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith('/')) return value;
    return `/${value.replace(/^\.\//, '')}`;
  }

  function selectedUnits() {
    return [...items.querySelectorAll('.item-row')].reduce((sum, row) => {
      const product = row.querySelector('[data-item="product"]')?.value;
      if (!product) return sum;
      return sum + Math.max(1, Number(row.querySelector('[data-item="qty"]')?.value) || 1);
    }, 0);
  }

  function c807WasContraEntrega() {
    return Number(state.editing?.comisionC807 || 0) > 0;
  }

  function automaticShipping() {
    const delivery = deliverySelect.value;
    const moneyState = moneySelect.value;
    if (delivery === 'Pedido Express') return selectedUnits();
    if (isC807Delivery(delivery)) {
      if (c807WasContraEntrega()) return 4.50;
      return moneyState === 'En caja' ? 4.00 : 4.50;
    }
    return 0;
  }

  function setAutomaticShipping() {
    if (state.shippingManual) return;
    const next = automaticShipping();
    shippingInput.value = Number(next).toFixed(2).replace(/\.00$/, '');
  }

  function netSaleTotal(sale) {
    const gross = Number(sale?.total) || 0;
    const commission = saleC807Commission(sale);
    return Math.max(0, Number((gross - commission).toFixed(2)));
  }

  const originalUpdateTotals = updateTotals;
  updateTotals = function () {
    setAutomaticShipping();
    const subtotal = [...items.querySelectorAll('.item-row')].reduce((sum, row) => {
      const qty = Number(row.querySelector('[data-item="qty"]')?.value) || 0;
      const price = Number(row.querySelector('[data-item="price"]')?.value) || 0;
      return sum + qty * price;
    }, 0);
    const shipping = Number(shippingInput.value) || 0;
    const gross = subtotal + shipping;
    const delivery = deliverySelect.value;
    const moneyState = moneySelect.value;
    const isC807 = isC807Delivery(delivery);
    const commission = editorC807Commission(gross, delivery, moneyState);
    const net = Math.max(0, gross - commission);

    document.querySelector('#saleSubtotal').textContent = money(subtotal);
    document.querySelector('#saleShippingTotal').textContent = money(shipping);
    document.querySelector('#saleTotal').textContent = money(net);

    const guideWrap = document.querySelector('#saleC807GuideWrap');
    const commissionWrap = document.querySelector('#saleC807CommissionWrap');
    if (guideWrap) guideWrap.hidden = !isC807;
    if (commissionWrap) commissionWrap.hidden = !isC807;
    const guideValue = document.querySelector('#saleC807Guide');
    const commissionValue = document.querySelector('#saleC807Commission');
    if (guideValue) guideValue.textContent = money(c807GuideCost(delivery));
    if (commissionValue) commissionValue.textContent = money(commission);
  };

  // Mantiene editable el costo: cuando el usuario escribe, dejamos de sustituirlo automáticamente.
  shippingInput.addEventListener('input', () => {
    state.shippingManual = true;
    updateTotals();
  });

  // Cambiar empresa o estado de dinero vuelve a aplicar la tarifa automática correspondiente.
  deliverySelect.addEventListener('change', () => {
    state.shippingManual = false;
    updateTotals();
  });
  moneySelect.addEventListener('change', () => {
    state.shippingManual = false;
    updateTotals();
  });

  const originalResetForm = resetForm;
  resetForm = function () {
    state.shippingManual = false;
    originalResetForm();
  };

  // Inventario con miniatura de producto.
  function enhanceInventoryImages() {
    document.querySelectorAll('.inventory-row').forEach(row => {
      const info = row.querySelector('.inventory-product');
      if (!info || info.querySelector('.inventory-product-image')) return;
      const code = info.querySelector('small')?.textContent?.trim();
      const product = state.products.find(p => String(p.codigo || '').trim() === code);
      if (!product) return;
      const img = document.createElement('img');
      img.className = 'inventory-product-image';
      img.alt = product.nombre || product.codigo || 'Prenda HAKI';
      img.src = productImage(product);
      img.loading = 'lazy';
      img.onerror = () => { img.src = '/images/producto.svg'; };
      info.prepend(img);
    });
  }

  const originalRenderInventory = renderInventory;
  renderInventory = function () {
    originalRenderInventory();
    enhanceInventoryImages();
  };
  document.querySelector('#inventorySearch')?.addEventListener('input', () => requestAnimationFrame(enhanceInventoryImages));

  // Resumen semanal: total neto y destino visible.
  function enhanceWeekSummary() {
    const active = state.sales.filter(isActiveSale);
    const metricSales = document.querySelector('#metricSales');
    const metricPending = document.querySelector('#metricPending');
    if (metricSales) metricSales.textContent = money(active.reduce((sum, sale) => sum + netSaleTotal(sale), 0));
    if (metricPending) metricPending.textContent = money(active.filter(sale => sale.dinero === 'Pendiente').reduce((sum, sale) => sum + netSaleTotal(sale), 0));

    document.querySelectorAll('.sale-table').forEach(table => {
      const headerRow = table.querySelector('thead tr');
      if (headerRow && !headerRow.querySelector('[data-destination-head]')) {
        const th = document.createElement('th');
        th.dataset.destinationHead = '1';
        th.textContent = 'Destino';
        const deliveryHead = [...headerRow.children].find(cell => cell.textContent.trim() === 'Entrega');
        headerRow.insertBefore(th, deliveryHead || null);
        const totalHead = [...headerRow.children].find(cell => cell.textContent.trim() === 'Total');
        if (totalHead) totalHead.textContent = 'Total a cobrar';
      }
    });

    document.querySelectorAll('tr[data-sale]').forEach(row => {
      const sale = state.sales.find(entry => String(entry.id) === String(row.dataset.sale));
      if (!sale) return;
      const totalCell = row.querySelector('td[data-label="Total"]');
      if (totalCell) {
        totalCell.dataset.label = 'Total a cobrar';
        totalCell.innerHTML = `<strong>${money(netSaleTotal(sale))}</strong>`;
      }
      if (!row.querySelector('td[data-label="Destino"]')) {
        const td = document.createElement('td');
        td.dataset.label = 'Destino';
        td.textContent = sale.lugarHorario || '—';
        const deliveryCell = row.querySelector('td[data-label="Entrega"]');
        row.insertBefore(td, deliveryCell || null);
      }
    });
  }

  const originalRenderWeek = renderWeek;
  renderWeek = function () {
    originalRenderWeek();
    enhanceWeekSummary();
  };

  // Si la pantalla ya estaba pintada al cargar este archivo, la mejoramos de inmediato.
  requestAnimationFrame(() => {
    enhanceInventoryImages();
    enhanceWeekSummary();
    updateTotals();
  });
})();
