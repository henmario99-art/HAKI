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

  window.hakiSetPanel = setPanel;
  function setPanel(name) {
    window.hakiPanelChanged?.(name);
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
    if (toolbar) toolbar.hidden = true;
    if (archived && typeof loadArchivedSales === 'function') loadArchivedSales().catch(error => toast(error.message, true));

    if (name === 'inventory') renderInventory();
    if (name === 'collections') loadReceivables();
    if (name === 'expenses') {
      suiteWeekStart = state.weekStart || suiteWeekStart;
      loadExpenses(suiteWeekStart);
    }
    if (name === 'dashboard') {
      suiteWeekStart = state.weekStart || suiteWeekStart;
      loadDashboard(suiteWeekStart);
    }
    window.HAKI_UI?.reveal(name==='archived'?archivedView:panelViews[name]);
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
      changeWeek(addDays(state.weekStart, -7));
    });
    root?.querySelector('[data-suite-next]')?.addEventListener('click', () => {
      changeWeek(addDays(state.weekStart, 7));
    });
    root?.querySelector('[data-suite-current]')?.addEventListener('click', () => {
      changeWeek(mondayOf(new Date()));
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
  let receivablesRequest = 0;
  function clearReceivables(reset=true) {
    const root = panelViews.collections;
    if (!root) return;
    const finish=window.HAKI_UI?.begin(root.querySelector('#collectionsList'),'rows',4,{reset,metrics:[root.querySelector('#collectionsTotal'),root.querySelector('#collectionsCount')]});
    if(reset){root.querySelector('#collectionsTotal').textContent = money(0);root.querySelector('#collectionsCount').textContent = '0';}
    return finish;
  }
  window.hakiCollectionsWeekChanging = () => {
    ++receivablesRequest;
    if (!panelViews.collections?.hidden) clearReceivables();
  };
  window.hakiCollectionsWeekChanged = () => {
    if (!panelViews.collections?.hidden) return loadReceivables();
  };
  async function loadReceivables() {
    const root = panelViews.collections;
    if (!root) return;
    const list = root.querySelector('#collectionsList');
    const total = root.querySelector('#collectionsTotal');
    const count = root.querySelector('#collectionsCount');
    const request = ++receivablesRequest;
    const weekStart = state.weekStart || mondayOf(new Date());
    const finish=clearReceivables(list.dataset.uiWeek!==weekStart);
    let loaded=false;
    try {
      const data = await api(`sales?mode=receivables&weekStart=${encodeURIComponent(weekStart)}`, { method: 'GET' });
      if (request !== receivablesRequest || weekStart !== state.weekStart) return;
      const receivables = (data.receivables || []).sort((a,b)=>String(a.createdAt || a.fecha || '').localeCompare(String(b.createdAt || b.fecha || '')) || String(a.id).localeCompare(String(b.id)));
      if (total) total.textContent = money(receivables.reduce((sum, sale) => sum + saleNet(sale), 0));
      if (count) count.textContent = String(receivables.length);
      renderReceivables(receivables);list.dataset.uiWeek=weekStart;loaded=true;
    } catch (error) {
      if (request !== receivablesRequest || weekStart !== state.weekStart) return;
      list.innerHTML = `<div class="suite-empty">${escapeHtml(error.message)}</div>`;
    } finally {finish?.(loaded);}
  }

  function renderReceivables(receivables) {
    const list = document.querySelector('#collectionsList');
    if (!list) return;
    if (!receivables.length) {
      list.innerHTML = '<div class="suite-empty"><strong>No hay cobros pendientes en esta semana.</strong></div>';
      return;
    }
    list.replaceChildren();
    receivables.forEach(sale => {
      const card = document.createElement('article');
      card.className = 'collection-card';
      card.dataset.saleId = sale.id;
      const delivered = sale.fechaRetiro || sale.fecha;
      const copy = document.createElement('dl');
      for (const [label,value] of [['Fecha entrega:',new Date(delivered+'T12:00:00').toLocaleDateString('es-SV',{weekday:'long',day:'numeric'})],['Cliente:',sale.cliente],['Destino:',sale.lugarHorario],['Total cobrado:',money(saleNet(sale))],['Página:',sale.canal]]) {
        const dt=document.createElement('dt');dt.textContent=label;
        const dd=document.createElement('dd');dd.textContent=value || '—';copy.append(dt,dd);
      }
      const aside=document.createElement('div');aside.className='collection-aside';
      const label=document.createElement('label');label.className='paid-toggle';label.append(document.createTextNode('Cancelado:'));
      const input=document.createElement('input');input.type='checkbox';input.setAttribute('aria-label',`Confirmar cobro recibido de ${sale.cliente}`);input.setAttribute('role','switch');
      label.append(input);aside.append(label);
      input.addEventListener('change',async()=>{
        if(!confirm(`¿Confirmar que ya recibiste ${money(saleNet(sale))} de ${sale.cliente || 'este pedido'}?`)){input.checked=false;return;}
        input.disabled=true;
        try{
          await api('sales',{method:'PATCH',body:JSON.stringify({id:sale.id,field:'dinero',value:'En caja',updatedAt:sale.updatedAt,cobroCancelado:true})});
          toast('Cobro recibido y enviado a caja');await loadReceivables();await loadWeek();
        }catch(e){input.checked=false;input.disabled=false;toast(e.message,true);}
      });
      if(sale.fotoPaquete){
        const photo=document.createElement('button');photo.type='button';photo.className='collection-photo';photo.setAttribute('aria-label',`Abrir fotografía del paquete de ${sale.cliente}`);
        const img=document.createElement('img');img.src=sale.fotoPaquete;img.alt='Fotografía del paquete';photo.append(img);photo.onclick=()=>hakiPhotoView(sale.fotoPaquete);aside.append(photo);
      }
      card.append(copy,aside);list.append(card);
    });
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

  let expensesRequest = 0;
  function clearExpenses(reset=true) {
    const list = document.querySelector('#expensesList');
    const finish=window.HAKI_UI?.begin(list,'rows',4,{reset,metrics:[document.querySelector('#expensesTotal')]});
    if(reset)document.querySelector('#expensesTotal').textContent = money(0);
    return finish;
  }
  window.hakiExpensesWeekChanging = () => {
    ++expensesRequest;
    if (!expenseRoot?.hidden) clearExpenses();
  };
  window.hakiExpensesWeekChanged = () => {
    if (!expenseRoot?.hidden) return loadExpenses(state.weekStart);
  };
  async function loadExpenses(start = state.weekStart) {
    const request = ++expensesRequest;
    suiteWeekStart = start;
    const range = expenseRoot?.querySelector('[data-suite-range]');
    if (range) range.textContent = weekRangeText(start);
    const list = document.querySelector('#expensesList');
    const finish=clearExpenses(list?.dataset.uiWeek!==start);
    let loaded=false;
    try {
      const data = await api(`sales?mode=expenses&weekStart=${encodeURIComponent(start)}`, { method: 'GET' });
      if (request !== expensesRequest || start !== state.weekStart) return;
      renderExpenses((data.expenses || []).filter(expense => expense.fecha && mondayOf(expense.fecha) === start));if(list)list.dataset.uiWeek=start;loaded=true;
    } catch (error) {
      if (request !== expensesRequest || start !== state.weekStart) return;
      if (list) list.innerHTML = `<div class="suite-empty">${escapeHtml(error.message)}</div>`;
    } finally {finish?.(loaded);}
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
      await loadExpenses(state.weekStart);
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
  let dashboardRequest = 0;
  function clearDashboard(reset=true) {
    const content = document.querySelector('#dashboardContent');
    if (content && reset) delete content.dataset.weekStart;
    return window.HAKI_UI?.begin(content,'rows',6,{reset});
  }
  window.hakiDashboardWeekChanging = () => {
    ++dashboardRequest;
    if (!dashboardRoot?.hidden) clearDashboard();
  };
  window.hakiDashboardWeekChanged = () => {
    if (!dashboardRoot?.hidden) return loadDashboard();
  };

  async function loadDashboard(start = state.weekStart || mondayOf(new Date())) {
    const request = ++dashboardRequest;
    suiteWeekStart = start;
    const range = dashboardRoot?.querySelector('[data-suite-range]');
    if (range) range.textContent = weekRangeText(start);
    const content = document.querySelector('#dashboardContent');
    const finish=clearDashboard(content?.dataset.weekStart!==start);
    let loaded=false;
    try {
      const [weekData, expenseData] = await Promise.all([
        api(`sales?weekStart=${encodeURIComponent(start)}`, { method: 'GET' }),
        api(`sales?mode=expenses&weekStart=${encodeURIComponent(start)}`, { method: 'GET' }),
      ]);
      if (request !== dashboardRequest || start !== state.weekStart) return;
      renderDashboard(
        (weekData.sales || []).filter(sale => sale.fecha && mondayOf(sale.fecha) === start),
        (expenseData.expenses || []).filter(expense => expense.fecha && mondayOf(expense.fecha) === start),
        weekData.inventory || {}
      );
      content.dataset.weekStart = start;loaded=true;
    } catch (error) {
      if (request !== dashboardRequest || start !== state.weekStart) return;
      if (content) content.innerHTML = `<div class="suite-empty">${escapeHtml(error.message)}</div>`;
    } finally {finish?.(loaded);}
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
        <article class="dash-card primary"><span>Total que queda</span><strong>${money(weekNet)}</strong></article>
        <article class="dash-card"><span>Ventas totales</span><strong>${money(gross)}</strong></article>
        <article class="dash-card"><span>Gastos semanales</span><strong>${money(expenseTotal)}</strong></article>
        <article class="dash-card"><span>Comisiones C807</span><strong>${money(commissions)}</strong></article>
        <article class="dash-card"><span>En caja</span><strong>${money(inCash)}</strong></article>
        <article class="dash-card"><span>Pendiente de cobro</span><strong>${money(pending)}</strong></article>
        <article class="dash-card"><span>Pedidos</span><strong>${active.length}</strong></article>
        <article class="dash-card"><span>Ticket promedio</span><strong>${money(average)}</strong></article>
      </section>
      <section class="dashboard-insights">
        <article class="best-product">
          ${productImg ? `<img src="${escapeHtml(productImg.startsWith('http') || productImg.startsWith('/') ? productImg : `/${productImg}`)}" alt="">` : '<div class="best-product-placeholder">HAKI</div>'}
          <div><span>Prenda más vendida</span><strong>${escapeHtml(topProduct?.nombre || 'Sin ventas')}</strong></div>
        </article>
        <article class="insight-list">
          <div><span>Destino más frecuente</span><strong>${escapeHtml(topDestination?.[0] || '—')}</strong></div>
          <div><span>Stock bajo</span><strong>${lowStock}</strong></div>
          <div><span>Ventas netas</span><strong>${money(salesNet)}</strong></div>
        </article>
      </section>`;
    content.querySelector('.best-product img')?.addEventListener('error', event => { event.currentTarget.style.display = 'none'; });
  }

  document.querySelector('#refreshDashboard')?.addEventListener('click', () => loadDashboard());

  // Si sales.js cambia la semana, las vistas financieras tomarán la nueva semana al abrirse.
  document.querySelector('#todayWeek')?.addEventListener('click', () => { suiteWeekStart = mondayOf(new Date()); });
  document.querySelector('#prevWeek')?.addEventListener('click', () => { suiteWeekStart = state.weekStart; });
  document.querySelector('#nextWeek')?.addEventListener('click', () => { suiteWeekStart = state.weekStart; });
})();
