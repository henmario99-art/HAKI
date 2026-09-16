(() => {
  if (typeof state !== 'object') return;

  const title = document.querySelector('#weekTitle');
  const month = document.querySelector('#weekRange');
  const salesTab = document.querySelector('.sales-tabs [data-tab="sales"]');
  const STORAGE_KEY = 'haki-sales-period-labels-v1';

  function readLabels() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function saveLabels(labels) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(labels)); }
    catch {}
  }

  function periodKey() {
    return state?.salesPeriod?.start || state?.weekStart || '';
  }

  function defaultWeekLabel() {
    return state?.salesPeriod?.index ? `Semana ${state.salesPeriod.index}` : 'Semana';
  }

  function defaultMonthLabel() {
    const start = state?.salesPeriod?.start;
    if (!start) return '';
    const date = new Date(`${start}T12:00:00`);
    return new Intl.DateTimeFormat('es-SV', { month: 'long', year: 'numeric' })
      .format(date)
      .replace(/^./, letter => letter.toUpperCase());
  }

  function storedForCurrentPeriod() {
    const key = periodKey();
    const all = readLabels();
    return key ? (all[key] || {}) : {};
  }

  function setTextIfNeeded(field, value) {
    if (!field || document.activeElement === field) return;
    const next = String(value || '');
    if (field.textContent !== next) field.textContent = next;
  }

  function applyLabels() {
    const stored = storedForCurrentPeriod();
    setTextIfNeeded(title, stored.week || defaultWeekLabel());
    setTextIfNeeded(month, stored.month || defaultMonthLabel());
  }

  function persistField(field, keyName, fallback) {
    const key = periodKey();
    if (!key) return;
    const all = readLabels();
    const current = all[key] || {};
    const value = String(field.textContent || '').trim();
    if (!value || value === fallback()) delete current[keyName];
    else current[keyName] = value;
    if (Object.keys(current).length) all[key] = current;
    else delete all[key];
    saveLabels(all);
    applyLabels();
  }

  function makeEditable(field, name, keyName, fallback) {
    if (!field) return;
    field.contentEditable = 'true';
    field.spellcheck = false;
    field.classList.add('haki-editable-period-label');
    field.setAttribute('role', 'textbox');
    field.setAttribute('aria-label', `Editar ${name}`);
    field.setAttribute('title', `Toca para editar ${name}. Esto no cambia las fechas de los días.`);
    field.addEventListener('focus', () => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(field);
      selection.removeAllRanges();
      selection.addRange(range);
    });
    field.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        field.blur();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        applyLabels();
        field.blur();
      }
    });
    field.addEventListener('blur', () => persistField(field, keyName, fallback));
  }

  makeEditable(title, 'semana', 'week', defaultWeekLabel);
  makeEditable(month, 'mes', 'month', defaultMonthLabel);

  let applyQueued = false;
  const observer = new MutationObserver(() => {
    if (document.activeElement === title || document.activeElement === month || applyQueued) return;
    applyQueued = true;
    requestAnimationFrame(() => {
      applyQueued = false;
      applyLabels();
    });
  });
  if (title) observer.observe(title, { childList: true, characterData: true, subtree: true });
  if (month) observer.observe(month, { childList: true, characterData: true, subtree: true });
  applyLabels();

  function hideSalesMenu() {
    const menu = document.querySelector('.haki-admin-menu');
    const backdrop = document.querySelector('.haki-admin-menu-backdrop');
    if (menu) menu.hidden = true;
    if (backdrop) backdrop.hidden = true;
    salesTab?.querySelector('.haki-sales-menu-toggle')?.setAttribute('aria-expanded', 'false');
  }

  function returnToSales() {
    salesTab?.click();
    requestAnimationFrame(() => {
      hideSalesMenu();
      document.body.classList.remove('haki-suite-open');
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }

  const panels = [
    { id: 'collectionsView', icon: '$', iconClass: 'cash', menuPanel: 'collections' },
    { id: 'expensesView', icon: '▤', iconClass: 'bill', menuPanel: 'expenses' },
    { id: 'dashboardView', icon: '▥', iconClass: 'chart', menuPanel: 'dashboard' },
  ];

  panels.forEach(({ id, icon, iconClass, menuPanel }) => {
    const root = document.getElementById(id);
    const header = root?.querySelector('.suite-header');
    const heading = header?.querySelector('h1');
    if (!root || !header || !heading) return;

    if (!heading.querySelector('.suite-title-icon')) {
      const badge = document.createElement('span');
      badge.className = `suite-title-icon ${iconClass}`;
      badge.textContent = icon;
      badge.setAttribute('aria-hidden', 'true');
      heading.prepend(badge);
    }

    if (!header.querySelector('.suite-back-sales')) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'suite-back-sales';
      back.innerHTML = '<span aria-hidden="true">←</span><span>Ventas</span>';
      back.addEventListener('click', returnToSales);
      header.prepend(back);
    }

    const menuIcon = document.querySelector(`.haki-admin-menu-item[data-open-panel="${menuPanel}"] .haki-admin-menu-icon`);
    if (menuIcon) {
      menuIcon.textContent = icon;
      menuIcon.classList.add(iconClass);
    }
  });
})();

(() => {
  if (typeof api !== 'function' || typeof state !== 'object') return;

  // Reiniciar Dashboard: vuelve a la semana actual y fuerza el recálculo.
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

  // Inventario: permite guardar de una sola vez los campos modificados desde Ventas.
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
