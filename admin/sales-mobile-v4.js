(() => {
  if (typeof api !== 'function' || typeof state !== 'object') return;

  // ---------- Dashboard: reinicio seguro ----------
  // Reiniciar no borra ventas ni gastos. Vuelve a la semana actual y recalcula el dashboard.
  const dashboard = document.querySelector('#dashboardView');
  const dashboardActions = dashboard?.querySelector('.suite-actions');
  if (dashboard && dashboardActions && !dashboardActions.querySelector('.dashboard-reset-button')) {
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'button secondary dashboard-reset-button';
    reset.textContent = 'Reiniciar Dashboard';
    reset.title = 'Volver a la semana actual y recalcular el Dashboard';
    reset.addEventListener('click', () => {
      const current = dashboard.querySelector('[data-suite-current]');
      const refresh = document.querySelector('#refreshDashboard');
      if (current) current.click();
      else refresh?.click();
      if (typeof toast === 'function') toast('Dashboard reiniciado a la semana actual');
    });
    dashboardActions.prepend(reset);
  }

  // ---------- Inventario: guardar cambios desde la ventana de Ventas ----------
  const inventoryView = document.querySelector('#inventoryView');
  const inventoryHead = inventoryView?.querySelector('.inventory-head');
  const inventoryList = document.querySelector('#inventoryList');
  const inventorySearch = document.querySelector('#inventorySearch');

  if (inventoryView && inventoryHead && inventoryList && inventorySearch) {
    let tools = inventoryHead.querySelector('.inventory-tools');
    if (!tools) {
      tools = document.createElement('div');
      tools.className = 'inventory-tools';
      inventorySearch.replaceWith(tools);
      tools.append(inventorySearch);
    }

    let updateButton = tools.querySelector('.inventory-update-button');
    if (!updateButton) {
      updateButton = document.createElement('button');
      updateButton.type = 'button';
      updateButton.className = 'button primary inventory-update-button';
      updateButton.textContent = 'Actualizar inventario';
      tools.append(updateButton);
    }

    inventoryList.addEventListener('input', event => {
      const input = event.target.closest('[data-stock]');
      if (!input) return;
      input.closest('.inventory-row')?.classList.add('is-dirty');
    });

    function productForRow(row) {
      const code = row.querySelector('.inventory-product small')?.textContent?.trim() || '';
      return Array.isArray(state.products)
        ? state.products.find(product => String(product.codigo || '').trim() === code)
        : null;
    }

    function stockForRow(row) {
      const next = {};
      row.querySelectorAll('[data-stock]').forEach(input => {
        next[input.dataset.stock] = Math.max(0, Math.trunc(Number(input.value) || 0));
      });
      return next;
    }

    updateButton.addEventListener('click', async () => {
      if (updateButton.disabled) return;
      updateButton.disabled = true;
      const originalText = updateButton.textContent;
      updateButton.textContent = 'Actualizando…';

      try {
        const dirtyRows = [...inventoryList.querySelectorAll('.inventory-row.is-dirty')];

        if (!dirtyRows.length) {
          const data = await api('sales?mode=inventory', { method: 'GET' });
          state.inventory = data.inventory || state.inventory || {};
          if (typeof renderInventory === 'function') renderInventory();
          if (typeof toast === 'function') toast('Inventario actualizado');
          return;
        }

        for (const row of dirtyRows) {
          const product = productForRow(row);
          if (!product) continue;
          const data = await api('sales?mode=inventory', {
            method: 'PUT',
            body: JSON.stringify({ productId: product.id, stock: stockForRow(row) }),
          });
          state.inventory = data.inventory || state.inventory;
          row.classList.remove('is-dirty');
        }

        if (typeof renderInventory === 'function') renderInventory();
        if (typeof toast === 'function') toast('Inventario guardado y actualizado');
      } catch (error) {
        if (typeof toast === 'function') toast(error.message || 'No se pudo actualizar el inventario', true);
      } finally {
        updateButton.disabled = false;
        updateButton.textContent = originalText;
      }
    });
  }
})();
