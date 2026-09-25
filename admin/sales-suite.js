(() => {
  const panelViews = {
    sales: document.querySelector('#salesView'),
    inventory: document.querySelector('#inventoryView'),
    collections: document.querySelector('#collectionsView'),
    expenses: document.querySelector('#expensesView'),
    dashboard: document.querySelector('#dashboardView'),
  };
  const destinations = Array.isArray(window.HAKI_DESTINATIONS) ? window.HAKI_DESTINATIONS : [];
  let suiteWeekStart = state.weekStart || mondayOf(new Date());
  let currentDestination = null;
  let expenseEditing = null;

  const normalizeSearch = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
  const friendlyDestination = name => String(name || '')
    .replace(/\s+AGENCIA$/i, '')
    .replace(/^SAN SALVADOR METROGALERIAS$/i, 'Metrogalerías')
    .replace(/^SAN SALVADOR PLAZA JEREZ$/i, 'Plaza Jerez');
  const destinationImage = item => item?.image || '';
  const saleNet = sale => Math.max(0, Number(((Number(sale?.total) || 0) - (Number(sale?.comisionC807) || 0)).toFixed(2)));
  const merchandiseTotal = sale => Number(sale?.subtotal ?? ((Number(sale?.total) || 0) - (Number(sale?.envio) || 0))) || 0;
  const activeSale = sale => !['Cancelado', 'No retirado'].includes(sale?.estado);
  const totalUnits = sale => (sale?.items || []).reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);

  function setPanel(name) {
    const archived = name === 'archived';
    Object.entries(panelViews).forEach(([key, view]) => {
      if (!view) return;
      if (key === 'sales') view.hidden = !['sales','archived'].includes(name);
      else view.hidden = key !== name;
    });
    document.querySelectorAll('.sales-tabs .tab').forEach(tab => tab.classList.toggle('is-active', tab.dataset.tab === name));
    document.body.classList.remove('sale-editor-mode');

    const archivedView = document.querySelector('#archivedSalesView');
    const days = document.querySelector('#days');
    const metrics = document.querySelector('.metrics');
    const toolbar = document.querySelector('.week-toolbar');
    if (archivedView) archivedView.hidden = !archived;
    if (days) days.hidden = archived;
    if (metrics) metrics.hidden = archived;
    if (toolbar) toolbar.hidden = archived;
    if (archived && typeof loadArchivedSales === 'function') loadArchivedSales().catch(error => toast(error.message, true));

    if (name === 'collections') loadReceivables();
    if (name === 'expenses') {
      suiteWeekStart = state.weekStart || suiteWeekStart;
      loadExpenses(suiteWeekStart);
    }
    if (name === 'dashboard') {
      suiteWeekStart = state.weekStart || suiteWeekStart;
      loadDashboard(suiteWeekStart);
    }
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  }

  document.querySelectorAll('.sales-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => setPanel(tab.dataset.tab));
  });

  function weekRangeText(start) {
    return `${formatDate(start)} – ${formatDate(addDays(start, 6), true)}`;
  }

  function wireSuiteWeekNav(root, onChange) {
    root?.querySelector('[data-suite-prev]')?.addEventListener('click', () => {
      suiteWeekStart = addDays(suiteWeekStart, -7);
      onChange(suiteWeekStart);
    });
    root?.querySelector('[data-suite-next]')?.addEventListener('click', () => {
      suiteWeekStart = addDays(suiteWeekStart, 7);
      onChange(suiteWeekStart);
    });
    root?.querySelector('[data-suite-current]')?.addEventListener('click', () => {
      suiteWeekStart = mondayOf(new Date());
      onChange(suiteWeekStart);
    });
  }

  // ---------- Destinos visuales desde la carpeta de Drive ----------
  const placeInput = document.querySelector('#salePlace');
  if (placeInput) {
    const label = placeInput.closest('label');
    label?.classList.add('destination-field');
    const results = document.createElement('div');
    results.className = 'destination-results';
    results.hidden = true;
    const preview = document.createElement('div');
    preview.className = 'destination-preview';
    preview.hidden = true;
    label?.append(results, preview);

    function matchesDestination(destination, query) {
      const haystack = [destination.name, ...(destination.aliases || [])].map(normalizeSearch).join(' ');
      return haystack.includes(query);
    }

    function showDestinationPreview(destination) {
      currentDestination = destination || null;
      if (!destination) {
        preview.hidden = true;
        preview.replaceChildren();
        return;
      }
      preview.hidden = false;
      preview.innerHTML = `<img src="${escapeHtml(destinationImage(destination))}" alt=""><div><strong>${escapeHtml(friendlyDestination(destination.name))}</strong><span>Destino de encomienda</span></div><a href="${escapeHtml(destination.url)}" target="_blank" rel="noopener">Ver imagen</a>`;
      preview.querySelector('img')?.addEventListener('error', event => { event.currentTarget.style.display = 'none'; });
    }

    function renderDestinationResults() {
      const query = normalizeSearch(placeInput.value);
      const list = destinations
        .filter(destination => !query || matchesDestination(destination, query))
        .slice(0, 10);
      results.replaceChildren();
      if (!list.length) {
        results.hidden = true;
        return;
      }
      list.forEach(destination => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'destination-option';
        button.innerHTML = `<img src="${escapeHtml(destinationImage(destination))}" alt=""><span><strong>${escapeHtml(friendlyDestination(destination.name))}</strong><small>${escapeHtml(destination.name)}</small></span>`;
        button.querySelector('img')?.addEventListener('error', event => { event.currentTarget.style.visibility = 'hidden'; });
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => {
          placeInput.value = friendlyDestination(destination.name);
          showDestinationPreview(destination);
          results.hidden = true;
        });
        results.append(button);
      });
      results.hidden = false;
    }

    placeInput.addEventListener('focus', renderDestinationResults);
    placeInput.addEventListener('input', () => {
      const typed = normalizeSearch(placeInput.value);
      if (currentDestination && !matchesDestination(currentDestination, typed)) showDestinationPreview(null);
      renderDestinationResults();
    });
    placeInput.addEventListener('blur', () => setTimeout(() => { results.hidden = true; }, 120));

    const baseFormSale = formSale;
    formSale = function () {
      const sale = baseFormSale();
      sale.destinoDriveId = currentDestination?.id || state.editing?.destinoDriveId || '';
      sale.destinoImagen = currentDestination?.image || state.editing?.destinoImagen || '';
      return sale;
    };

    const baseResetForm = resetForm;
    resetForm = function () {
      currentDestination = null;
      baseResetForm();
      showDestinationPreview(null);
    };

    const baseOpenEditSale = openEditSale;
    openEditSale = function (sale) {
      baseOpenEditSale(sale);
      currentDestination = destinations.find(item => item.id === sale?.destinoDriveId) || null;
      if (!currentDestination && sale?.lugarHorario) {
        const query = normalizeSearch(sale.lugarHorario);
        currentDestination = destinations.find(item => matchesDestination(item, query)) || null;
      }
      showDestinationPreview(currentDestination);
    };
  }

  // ---------- Cobros pendientes de encomiendas ----------
  async function loadReceivables() {
    const root = panelViews.collections;
    if (!root) return;
    const list = root.querySelector('#collectionsList');
    const total = root.querySelector('#collectionsTotal');
    const count = root.querySelector('#collectionsCount');
    list.innerHTML = '<div class="suite-loading">Cargando cobros pendientes…</div>';
    try {
      const data = await api(`sales?mode=receivables&anchor=${encodeURIComponent(isoDate(new Date()))}&weeks=26`, { method: 'GET' });
      const receivables = data.receivables || [];
      if (total) total.textContent = money(receivables.reduce((sum, sale) => sum + saleNet(sale), 0));
      if (count) count.textContent = String(receivables.length);
      renderReceivables(receivables);
    } catch (error) {
      list.innerHTML = `<div class="suite-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderReceivables(receivables) {
    const list = document.querySelector('#collectionsList');
    if (!list) return;
    if (!receivables.length) {
      list.innerHTML = '<div class="suite-empty"><strong>No hay encomiendas pendientes de cobro.</strong><span>Cuando una venta por Pedido Express o C807 esté Retirada y el dinero siga Pendiente, aparecerá aquí.</span></div>';
      return;
    }
    const table = document.createElement('table');
    table.className = 'suite-table collections-table';
    table.innerHTML = '<thead><tr><th>Solicitado</th><th>Cancelado</th><th>Fecha entrega</th><th>Cliente</th><th>Destino</th><th>Total cobrado</th><th>Página</th></tr></thead>';
    const tbody = document.createElement('tbody');
    receivables.forEach(sale => {
      const row = document.createElement('tr');
      const delivered = sale.fechaRetiro || sale.fecha;
      const requested = sale.cobroSolicitadoAt ? new Date(sale.cobroSolicitadoAt).toLocaleDateString('es-SV') : '';
      row.innerHTML = `
        <td data-label="Solicitado"></td>
        <td data-label="Cancelado"></td>
        <td data-label="Fecha entrega"><strong>${escapeHtml(formatDate(delivered))}</strong></td>
        <td data-label="Cliente">${escapeHtml(sale.cliente || '—')}</td>
        <td data-label="Destino">${escapeHtml(sale.lugarHorario || '—')}</td>
        <td data-label="Total cobrado"><strong>${money(saleNet(sale))}</strong></td>
        <td data-label="Página">${escapeHtml(sale.canal || '—')}</td>`;
      const requestCell = row.children[0];
      const paidCell = row.children[1];
      const requestButton = document.createElement('button');
      requestButton.type = 'button';
      requestButton.className = `mini-check ${requested ? 'is-done' : ''}`;
      requestButton.textContent = requested ? `✓ ${requested}` : 'Solicitar';
      requestButton.addEventListener('click', async () => {
        requestButton.disabled = true;
        try {
          const updated = { ...sale, cobroSolicitadoAt: sale.cobroSolicitadoAt || new Date().toISOString() };
          await api('sales', { method: 'PUT', body: JSON.stringify({ sale: updated, previousWeekStart: sale.weekStart }) });
          toast('Cobro marcado como solicitado');
          await loadReceivables();
        } catch (error) { toast(error.message, true); requestButton.disabled = false; }
      });
      const paidButton = document.createElement('button');
      paidButton.type = 'button';
      paidButton.className = 'mini-check paid';
      paidButton.textContent = 'Marcar pagado';
      paidButton.addEventListener('click', async () => {
        if (!confirm(`¿Confirmar que ya recibiste ${money(saleNet(sale))} de ${sale.cliente || 'este pedido'}?`)) return;
        paidButton.disabled = true;
        try {
          const updated = { ...sale, dinero: 'En caja', cobroCanceladoAt: new Date().toISOString() };
          await api('sales', { method: 'PUT', body: JSON.stringify({ sale: updated, previousWeekStart: sale.weekStart }) });
          toast('Cobro recibido y enviado a caja');
          await loadReceivables();
          if (state.weekStart === sale.weekStart) await loadWeek();
        } catch (error) { toast(error.message, true); paidButton.disabled = false; }
      });
      requestCell.append(requestButton);
      paidCell.append(paidButton);
      tbody.append(row);
    });
    table.append(tbody);
    list.replaceChildren(table);
  }

  document.querySelector('#refreshCollections')?.addEventListener('click', loadReceivables);

  // ---------- Gastos ----------
  const expenseRoot = panelViews.expenses;
  wireSuiteWeekNav(expenseRoot, loadExpenses);
  const expenseForm = document.querySelector('#expenseForm');
  const expenseEditor = document.querySelector('#expenseEditor');

  function resetExpenseForm() {
    expenseEditing = null;
    expenseForm?.reset();
    const date = document.querySelector('#expenseDate');
    if (date) date.value = isoDate(new Date());
    const title = document.querySelector('#expenseEditorTitle');
    if (title) title.textContent = 'Nuevo gasto';
    document.querySelector('#deleteExpense')?.setAttribute('hidden', '');
  }

  function showExpenseEditor(expense = null) {
    resetExpenseForm();
    expenseEditing = expense;
    if (expense) {
      document.querySelector('#expenseEditorTitle').textContent = 'Editar gasto';
      document.querySelector('#expenseDate').value = expense.fecha || '';
      document.querySelector('#expenseCategory').value = expense.categoria || 'Otros';
      document.querySelector('#expenseDescription').value = expense.descripcion || '';
      document.querySelector('#expenseAmount').value = expense.monto || '';
      document.querySelector('#expenseMethod').value = expense.metodo || '';
      document.querySelector('#expenseNotes').value = expense.notas || '';
      document.querySelector('#deleteExpense').hidden = false;
    }
    expenseEditor.hidden = false;
    requestAnimationFrame(() => expenseEditor.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function hideExpenseEditor() {
    if (expenseEditor) expenseEditor.hidden = true;
    expenseEditing = null;
  }

  async function loadExpenses(start = suiteWeekStart) {
    suiteWeekStart = start;
    const range = expenseRoot?.querySelector('[data-suite-range]');
    if (range) range.textContent = weekRangeText(start);
    const list = document.querySelector('#expensesList');
    if (list) list.innerHTML = '<div class="suite-loading">Cargando gastos…</div>';
    try {
      const data = await api(`sales?mode=expenses&weekStart=${encodeURIComponent(start)}`, { method: 'GET' });
      renderExpenses(data.expenses || []);
    } catch (error) {
      if (list) list.innerHTML = `<div class="suite-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderExpenses(expenses) {
    const list = document.querySelector('#expensesList');
    const total = document.querySelector('#expensesTotal');
    if (total) total.textContent = money(expenses.reduce((sum, item) => sum + (Number(item.monto) || 0), 0));
    if (!list) return;
    if (!expenses.length) {
      list.innerHTML = '<div class="suite-empty"><strong>Sin gastos registrados esta semana.</strong><span>Registra guías, stickers, papel, empaques, publicidad y cualquier otro gasto del negocio.</span></div>';
      return;
    }
    const table = document.createElement('table');
    table.className = 'suite-table expenses-table';
    table.innerHTML = '<thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Método</th><th>Monto</th></tr></thead>';
    const tbody = document.createElement('tbody');
    expenses.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).forEach(expense => {
      const row = document.createElement('tr');
      row.innerHTML = `<td data-label="Fecha">${escapeHtml(formatDate(expense.fecha))}</td><td data-label="Categoría"><span class="expense-category">${escapeHtml(expense.categoria)}</span></td><td data-label="Descripción">${escapeHtml(expense.descripcion || '—')}</td><td data-label="Método">${escapeHtml(expense.metodo || '—')}</td><td data-label="Monto"><strong>${money(expense.monto)}</strong></td>`;
      row.addEventListener('click', () => showExpenseEditor(expense));
      tbody.append(row);
    });
    table.append(tbody);
    list.replaceChildren(table);
  }

  document.querySelector('#newExpense')?.addEventListener('click', () => showExpenseEditor());
  document.querySelector('#closeExpense')?.addEventListener('click', hideExpenseEditor);
  document.querySelector('#cancelExpense')?.addEventListener('click', hideExpenseEditor);

  expenseForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const save = document.querySelector('#saveExpense');
    save.disabled = true;
    try {
      const expense = {
        id: expenseEditing?.id,
        fecha: document.querySelector('#expenseDate').value,
        categoria: document.querySelector('#expenseCategory').value,
        descripcion: document.querySelector('#expenseDescription').value,
        monto: Number(document.querySelector('#expenseAmount').value) || 0,
        metodo: document.querySelector('#expenseMethod').value,
        notas: document.querySelector('#expenseNotes').value,
      };
      if (expenseEditing) {
        await api('sales?mode=expenses', { method: 'PUT', body: JSON.stringify({ expense, previousWeekStart: weekStartForExpense(expenseEditing.fecha) }) });
      } else {
        await api('sales?mode=expenses', { method: 'POST', body: JSON.stringify({ expense }) });
      }
      hideExpenseEditor();
      suiteWeekStart = mondayOf(expense.fecha);
      await loadExpenses(suiteWeekStart);
      toast(expenseEditing ? 'Gasto actualizado' : 'Gasto registrado');
    } catch (error) { toast(error.message, true); }
    finally { save.disabled = false; }
  });

  function weekStartForExpense(date) { return mondayOf(date); }

  document.querySelector('#deleteExpense')?.addEventListener('click', async () => {
    if (!expenseEditing || !confirm('¿Eliminar este gasto?')) return;
    try {
      await api('sales?mode=expenses', { method: 'DELETE', body: JSON.stringify({ id: expenseEditing.id, weekStart: weekStartForExpense(expenseEditing.fecha) }) });
      hideExpenseEditor();
      await loadExpenses(suiteWeekStart);
      toast('Gasto eliminado');
    } catch (error) { toast(error.message, true); }
  });

  // ---------- Dashboard semanal ----------
  const dashboardRoot = panelViews.dashboard;
  wireSuiteWeekNav(dashboardRoot, loadDashboard);

  async function loadDashboard(start = suiteWeekStart) {
    suiteWeekStart = start;
    const range = dashboardRoot?.querySelector('[data-suite-range]');
    if (range) range.textContent = weekRangeText(start);
    const content = document.querySelector('#dashboardContent');
    if (content) content.innerHTML = '<div class="suite-loading">Calculando la semana…</div>';
    try {
      const [weekData, expenseData] = await Promise.all([
        api(`sales?weekStart=${encodeURIComponent(start)}`, { method: 'GET' }),
        api(`sales?mode=expenses&weekStart=${encodeURIComponent(start)}`, { method: 'GET' }),
      ]);
      renderDashboard(weekData.sales || [], expenseData.expenses || [], weekData.inventory || {});
    } catch (error) {
      if (content) content.innerHTML = `<div class="suite-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderDashboard(sales, expenses, inventory) {
    const content = document.querySelector('#dashboardContent');
    if (!content) return;
    const active = sales.filter(activeSale);
    const gross = active.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const merchandise = active.reduce((sum, sale) => sum + merchandiseTotal(sale), 0);
    const commissions = active.reduce((sum, sale) => sum + (Number(sale.comisionC807) || 0), 0);
    const salesNet = merchandise;
    const expenseTotal = expenses.reduce((sum, expense) => sum + (Number(expense.monto) || 0), 0);
    const weekNet = salesNet - commissions - expenseTotal;
    const pending = active.filter(sale => sale.dinero === 'Pendiente').reduce((sum, sale) => sum + saleNet(sale), 0);
    const inCash = active.filter(sale => sale.dinero === 'En caja').reduce((sum, sale) => sum + saleNet(sale), 0);
    const units = active.reduce((sum, sale) => sum + totalUnits(sale), 0);
    const average = active.length ? salesNet / active.length : 0;

    const productMap = new Map();
    const destinationMap = new Map();
    active.forEach(sale => {
      (sale.items || []).forEach(item => {
        const key = String(item.productId || item.codigo);
        const current = productMap.get(key) || { productId: item.productId, codigo: item.codigo, nombre: item.nombre, qty: 0, revenue: 0 };
        current.qty += Number(item.cantidad) || 0;
        current.revenue += (Number(item.precio) || 0) * (Number(item.cantidad) || 0);
        productMap.set(key, current);
      });
      const destination = String(sale.lugarHorario || '').trim();
      if (destination) destinationMap.set(destination, (destinationMap.get(destination) || 0) + 1);
    });
    const topProduct = [...productMap.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)[0] || null;
    const topDestination = [...destinationMap.entries()].sort((a, b) => b[1] - a[1])[0] || null;
    const productInfo = topProduct ? state.products.find(product => String(product.id) === String(topProduct.productId)) : null;
    const productImg = productInfo ? (productInfo.imagen || productInfo.imagenRespaldo || '') : '';
    const lowStock = Object.values(inventory || {}).reduce((sum, stock) => sum + ['S','M','L','XL'].filter(size => Number(stock?.[size]) > 0 && Number(stock?.[size]) <= 2).length, 0);

    content.innerHTML = `
      <section class="dashboard-grid">
        <article class="dash-card primary"><span>Total que queda</span><strong>${money(weekNet)}</strong><small>Ventas de prendas menos comisiones y gastos</small></article>
        <article class="dash-card"><span>Ventas totales</span><strong>${money(gross)}</strong><small>Incluye envíos cobrados</small></article>
        <article class="dash-card"><span>Gastos semanales</span><strong>${money(expenseTotal)}</strong><small>${expenses.length} movimiento${expenses.length === 1 ? '' : 's'}</small></article>
        <article class="dash-card"><span>Comisiones C807</span><strong>${money(commissions)}</strong><small>Descontadas de los cobros</small></article>
        <article class="dash-card"><span>En caja</span><strong>${money(inCash)}</strong><small>Ventas marcadas como cobradas</small></article>
        <article class="dash-card"><span>Pendiente de cobro</span><strong>${money(pending)}</strong><small>Dinero todavía fuera de caja</small></article>
        <article class="dash-card"><span>Pedidos</span><strong>${active.length}</strong><small>${units} prendas vendidas</small></article>
        <article class="dash-card"><span>Ticket promedio</span><strong>${money(average)}</strong><small>Promedio neto por pedido</small></article>
      </section>
      <section class="dashboard-insights">
        <article class="best-product">
          ${productImg ? `<img src="${escapeHtml(productImg.startsWith('http') || productImg.startsWith('/') ? productImg : `/${productImg}`)}" alt="">` : '<div class="best-product-placeholder">HAKI</div>'}
          <div><span>Prenda más vendida</span><strong>${escapeHtml(topProduct?.nombre || 'Sin ventas')}</strong><small>${topProduct ? `${topProduct.qty} unidad${topProduct.qty === 1 ? '' : 'es'} · ${money(topProduct.revenue)}` : 'Aún no hay datos esta semana'}</small></div>
        </article>
        <article class="insight-list">
          <div><span>Destino más frecuente</span><strong>${escapeHtml(topDestination?.[0] || '—')}</strong><small>${topDestination ? `${topDestination[1]} pedido${topDestination[1] === 1 ? '' : 's'}` : 'Sin destinos esta semana'}</small></div>
          <div><span>Stock bajo</span><strong>${lowStock}</strong><small>Tallas con 1–2 unidades disponibles</small></div>
          <div><span>Ventas netas</span><strong>${money(salesNet)}</strong><small>Solo prendas vendidas, sin envíos</small></div>
        </article>
      </section>`;
    content.querySelector('.best-product img')?.addEventListener('error', event => { event.currentTarget.style.display = 'none'; });
  }

  document.querySelector('#refreshDashboard')?.addEventListener('click', () => loadDashboard(suiteWeekStart));

  // Si sales.js cambia la semana, las vistas financieras tomarán la nueva semana al abrirse.
  document.querySelector('#todayWeek')?.addEventListener('click', () => { suiteWeekStart = mondayOf(new Date()); });
  document.querySelector('#prevWeek')?.addEventListener('click', () => { suiteWeekStart = state.weekStart; });
  document.querySelector('#nextWeek')?.addEventListener('click', () => { suiteWeekStart = state.weekStart; });
})();
