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

  // Dashboard: vuelve a la semana actual y recalcula sin borrar registros.
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

  const inventoryView = document.querySelector('#inventoryView');
  const inventoryHead = inventoryView?.querySelector('.inventory-head');
  const inventoryList = document.querySelector('#inventoryList');
  const inventorySearch = document.querySelector('#inventorySearch');
  if (!inventoryView || !inventoryHead || !inventoryList || !inventorySearch) return;

  // Quita “Inventario privado” y su explicación. En ese espacio queda Regresar a Ventas.
  const infoBlock = inventoryHead.firstElementChild;
  if (infoBlock) {
    infoBlock.querySelectorAll('h1,p').forEach(node => node.remove());
    if (!infoBlock.querySelector('.inventory-back-sales')) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'inventory-back-sales';
      back.innerHTML = '<span class="arrow" aria-hidden="true">←</span><span>Ventas</span>';
      back.addEventListener('click', () => {
        document.querySelector('.haki-admin-menu')?.setAttribute('hidden', '');
        document.querySelector('.haki-admin-menu-backdrop')?.setAttribute('hidden', '');
        document.body.classList.remove('haki-suite-open');
        if (typeof switchTab === 'function') switchTab('sales');
        else document.querySelector('.sales-tabs [data-tab="sales"]')?.click();
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
      infoBlock.append(back);
    }
  }

  // Elimina cualquier botón global de versiones anteriores.
  inventoryHead.querySelectorAll('.inventory-update-button').forEach(button => button.remove());
  const tools = inventoryHead.querySelector('.inventory-tools');
  if (tools && tools.children.length === 1 && tools.firstElementChild === inventorySearch) {
    tools.replaceWith(inventorySearch);
  }

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

  async function updateRow(row, button) {
    if (button.disabled) return;
    const product = productForRow(row);
    if (!product) {
      if (typeof toast === 'function') toast('No se pudo identificar la prenda.', true);
      return;
    }

    button.disabled = true;
    const previousText = button.textContent;
    button.textContent = 'Actualizando…';
    try {
      const next = stockForRow(row);
      const data = await api('sales?mode=inventory', {
        method: 'PUT',
        body: JSON.stringify({ productId: product.id, stock: next }),
      });
      state.inventory = data.inventory || state.inventory;
      row.classList.remove('is-dirty');
      updateStockNotice(row, product);
      const total = row.querySelector('.inventory-total');
      if (total) total.textContent = String(Object.values(next).reduce((sum, value) => sum + value, 0));
      if (typeof toast === 'function') toast(`${product.nombre} actualizado`);
    } catch (error) {
      if (typeof toast === 'function') toast(error.message || 'No se pudo actualizar esta prenda', true);
    } finally {
      button.disabled = false;
      button.textContent = previousText;
    }
  }

  function updateStockNotice(row, product) {
    if (!product) return;
    let note = row.querySelector('.inventory-stock-notice');
    if (!note) { note = document.createElement('small'); note.className='inventory-stock-notice'; row.querySelector('.inventory-product')?.append(note); }
    const stock = state.inventory?.[String(product.id)];
    if (!stock) { if (note.textContent !== 'Inventario sin registrar') note.textContent = 'Inventario sin registrar'; return; }
    const zeros = ['S','M','L','XL'].filter(size => Number(stock[size]) === 0);
    const text = zeros.length === 4 ? 'Sin existencias' : zeros.length ? `Tallas en 0: ${zeros.join(', ')}` : 'Todas las tallas con existencias';
    if (note.textContent !== text) note.textContent = text;
  }
  function decorateInventoryRows() {
    inventoryList.querySelectorAll('.inventory-row').forEach(row => {
      updateStockNotice(row, productForRow(row));
      if (row.querySelector('.inventory-item-update')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button primary inventory-item-update';
      button.textContent = 'Actualizar inventario';
      button.addEventListener('click', () => updateRow(row, button));
      row.append(button);
    });
  }

  inventoryList.addEventListener('input', event => {
    const input = event.target.closest('[data-stock]');
    if (!input) return;
    input.closest('.inventory-row')?.classList.add('is-dirty');
  });

  let decorateQueued = false;
  const inventoryObserver = new MutationObserver(() => {
    if (decorateQueued) return;
    decorateQueued = true;
    requestAnimationFrame(() => {
      decorateQueued = false;
      decorateInventoryRows();
    });
  });
  inventoryObserver.observe(inventoryList, { childList: true, subtree: true });
  decorateInventoryRows();
})();
