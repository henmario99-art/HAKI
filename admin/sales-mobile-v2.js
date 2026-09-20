(() => {
  if (typeof api !== 'function' || typeof state !== 'object') return;

  const salesView = document.querySelector('#salesView');
  const inventoryView = document.querySelector('#inventoryView');
  const daysRoot = document.querySelector('#days');
  const metrics = document.querySelector('.metrics');
  const toolbar = document.querySelector('.week-toolbar');
  const tabs = document.querySelector('.sales-tabs');
  const topbar = document.querySelector('.sales-topbar');
  if (!salesView || !inventoryView || !daysRoot || !metrics || !toolbar || !tabs || !topbar) return;

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const asDate = iso => new Date(`${iso}T12:00:00`);
  const saleNet = sale => Math.max(0, Number(((Number(sale?.total) || 0) - (Number(sale?.comisionC807) || 0)).toFixed(2)));
  const merchandiseTotal = sale => Number(sale?.subtotal ?? ((Number(sale?.total) || 0) - (Number(sale?.envio) || 0))) || 0;
  const activeSale = sale => !['Cancelado', 'No retirado'].includes(sale?.estado);
  const statePill = value => value === 'Retirado' ? 'done' : (value === 'Cancelado' || value === 'No retirado' ? 'cancelled' : 'pending');

  function weekFromDate(value) {
    const iso = value instanceof Date ? isoDate(value) : value;
    const start = mondayOf(iso);
    const end = addDays(start, 6);

    // La semana pertenece al mes de su jueves. Así la semana que contiene
    // el día 1 se considera Semana 1 aunque el lunes caiga en el mes anterior.
    const thursday = asDate(addDays(start, 3));
    const year = thursday.getFullYear();
    const month = thursday.getMonth();
    const firstOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const firstWeekStart = mondayOf(firstOfMonth);
    const diffDays = Math.round((asDate(start) - asDate(firstWeekStart)) / 86400000);
    const index = Math.floor(diffDays / 7) + 1;

    return { start, end, year, month, index };
  }

  function adjacentWeek(period, direction) {
    return weekFromDate(addDays(period.start, direction * 7));
  }

  state.salesPeriod = weekFromDate(new Date());

  // ---------- Cabecera y navegación ----------
  topbar.classList.add('haki-mobile-topbar');
  const adminLink = topbar.querySelector('a[href="/admin/"]');
  if (adminLink) {
    adminLink.className = 'haki-admin-back';
    adminLink.textContent = '‹';
    adminLink.setAttribute('aria-label', 'Administrador');
    adminLink.title = 'Administrador';
  }

  tabs.classList.add('haki-primary-tabs');
  const salesTab = tabs.querySelector('[data-tab="sales"]');
  const inventoryTab = tabs.querySelector('[data-tab="inventory"]');
  const secondaryTabs = [...tabs.querySelectorAll('[data-tab="collections"],[data-tab="expenses"],[data-tab="dashboard"]')];
  secondaryTabs.forEach(tab => { tab.style.display = 'none'; });
  if (salesTab) salesTab.innerHTML = '<span class="haki-sales-menu-toggle" aria-expanded="false">Ventas <span class="chevron">⌄</span></span>';
  if (inventoryTab) inventoryTab.textContent = 'Inventario';

  const backdrop = document.createElement('div');
  backdrop.className = 'haki-admin-menu-backdrop';
  backdrop.hidden = true;

  const menu = document.createElement('aside');
  menu.className = 'haki-admin-menu';
  menu.hidden = true;
  menu.innerHTML = `
    <div class="haki-admin-menu-head"><strong>HAKI</strong><span>Administrador</span></div>
    <div class="haki-admin-menu-list">
      <button class="haki-admin-menu-item" type="button" data-open-panel="expenses"><span class="haki-admin-menu-icon">◉</span><span>Gasto</span><span class="haki-admin-menu-arrow">›</span></button>
      <button class="haki-admin-menu-item" type="button" data-open-panel="dashboard"><span class="haki-admin-menu-icon">▥</span><span>Dashboard</span><span class="haki-admin-menu-arrow">›</span></button>
      <button class="haki-admin-menu-item" type="button" data-open-panel="collections"><span class="haki-admin-menu-icon">▣</span><span>Cobros</span><span class="haki-admin-menu-arrow">›</span></button>
    </div>`;
  document.body.append(backdrop, menu);

  function closeMenu() {
    menu.hidden = true;
    backdrop.hidden = true;
    salesTab?.querySelector('.haki-sales-menu-toggle')?.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    menu.hidden = false;
    backdrop.hidden = false;
    salesTab?.querySelector('.haki-sales-menu-toggle')?.setAttribute('aria-expanded', 'true');
  }

  function toggleMenu() {
    if (menu.hidden) openMenu();
    else closeMenu();
  }

  backdrop.addEventListener('click', closeMenu);
  salesTab?.addEventListener('click', () => {
    document.body.classList.remove('haki-suite-open');
    // Esperamos a que sales-suite termine de activar la vista Ventas y luego
    // abrimos/cerramos el menú sin perder el clic en iPhone/Safari.
    requestAnimationFrame(toggleMenu);
  });

  menu.querySelectorAll('[data-open-panel]').forEach(button => {
    button.addEventListener('click', () => {
      const panel = button.dataset.openPanel;
      closeMenu();
      secondaryTabs.find(tab => tab.dataset.tab === panel)?.click();
      document.body.classList.add('haki-suite-open');
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  });

  inventoryTab?.addEventListener('click', () => {
    closeMenu();
    document.body.classList.remove('haki-suite-open');
    // Inventario es una vista propia, no forma parte de la semana.
    window.scrollTo({ top: 0, behavior: 'auto' });
  });

  // ---------- Métricas inferiores ----------
  metrics.classList.add('haki-bottom-metrics');
  salesView.classList.add('haki-sales-home');
  inventoryView.classList.add('haki-inventory-page');
  daysRoot.classList.add('haki-days-list');
  salesView.append(metrics);
  const metricCards = [...metrics.querySelectorAll('article')];
  if (metricCards[0]) metricCards[0].querySelector('span').textContent = 'Vendido';
  if (metricCards[1]) metricCards[1].querySelector('span').textContent = 'Pendiente';
  if (metricCards[2]) metricCards[2].querySelector('span').textContent = 'A cobrar';
  if (metricCards[3]) metricCards[3].querySelector('span').textContent = 'Pedidos';

  // ---------- Semana real: lunes a domingo ----------
  toolbar.classList.add('haki-period-toolbar');
  const prevButton = document.querySelector('#prevWeek');
  const nextButton = document.querySelector('#nextWeek');
  const todayButton = document.querySelector('#todayWeek');
  const newSaleButton = document.querySelector('#newSale');

  function replaceButton(old, id, text, label) {
    if (!old) return null;
    const button = old.cloneNode(false);
    button.id = id;
    button.className = old.className;
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    old.replaceWith(button);
    return button;
  }

  const prev = replaceButton(prevButton, 'prevWeek', '‹', 'Semana anterior');
  const next = replaceButton(nextButton, 'nextWeek', '›', 'Semana siguiente');
  if (todayButton) todayButton.style.display = 'none';
  if (newSaleButton) newSaleButton.style.display = 'none';

  function periodDates(period) {
    return Array.from({ length: 7 }, (_, index) => addDays(period.start, index));
  }

  async function fetchPeriod(period) {
    const response = await api(`sales?weekStart=${encodeURIComponent(period.start)}`, { method: 'GET' });
    return {
      sales: response.sales || [],
      inventory: response.inventory || state.inventory || {},
    };
  }

  function renderMetrics() {
    const active = state.sales.filter(activeSale);
    const sold = active.reduce((sum, sale) => sum + merchandiseTotal(sale), 0);
    const pendingOrders = active.filter(sale => sale.estado === 'Pendiente').length;
    const toCollect = active.filter(sale => sale.dinero === 'Pendiente').reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const orders = active.length;
    if (metricCards[0]) metricCards[0].querySelector('strong').textContent = money(sold);
    if (metricCards[1]) metricCards[1].querySelector('strong').textContent = String(pendingOrders);
    if (metricCards[2]) metricCards[2].querySelector('strong').textContent = money(toCollect);
    if (metricCards[3]) metricCards[3].querySelector('strong').textContent = String(orders);
    const unclaimed = document.querySelector('#metricUnclaimed');
    if (unclaimed) unclaimed.textContent = String(state.sales.filter(sale => sale.estado === 'No retirado').length);
  }

  function saleMiniCard(sale) {
    const card = document.createElement('article');
    card.className = 'haki-sale-mini';
    card.dataset.shippingStage = sale.etapaEnvio || 'Pedido tomado';
    const itemText = (sale.items || []).map(item => `${item.codigo} ${item.talla}${Number(item.cantidad) > 1 ? ` ×${item.cantidad}` : ''}`).join(' · ') || 'Pedido';
    const destination = sale.lugarHorario || 'Sin destino';
    card.innerHTML = `
      <div><strong>${escapeHtml(sale.cliente || 'Cliente')}</strong><small>${escapeHtml(itemText)}</small></div>
      <div class="amount">${money(saleNet(sale))}</div>
      <div class="meta">
        <span class="pill ${statePill(sale.estado)}">${escapeHtml(sale.estado || 'Pendiente')}</span>
        <span class="pill ${sale.dinero === 'En caja' ? 'done' : 'pending'}">${escapeHtml(sale.dinero || 'Pendiente')}</span>
        <span class="pill">${escapeHtml(destination)}</span>
      </div>`;
    card.addEventListener('click', () => openEditSale(sale));
    return card;
  }

  function weekdayName(iso) {
    const names = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    return names[asDate(iso).getDay()];
  }

  function renderPeriod() {
    const period = state.salesPeriod;
    const title = document.querySelector('#weekTitle');
    const range = document.querySelector('#weekRange');
    if (title) title.textContent = `Semana ${period.index}`;
    if (range) range.textContent = `${months[period.month]} ${period.year}`;

    renderMetrics();
    daysRoot.replaceChildren();

    periodDates(period).forEach(date => {
      const daySales = state.sales
        .filter(sale => sale.fecha === date)
        .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));

      const card = document.createElement('section');
      card.className = 'haki-day-card';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'haki-day-toggle';
      toggle.innerHTML = `
        <span class="haki-day-copy"><strong>${weekdayName(date)} ${asDate(date).getDate()}</strong><small>${daySales.length ? `${daySales.length} pedido${daySales.length === 1 ? '' : 's'}` : 'Sin ventas'}</small></span>
        <span class="haki-day-count">${daySales.length ? money(daySales.filter(activeSale).reduce((sum, sale) => sum + saleNet(sale), 0)) : ''}</span>
        <span class="haki-day-arrow">›</span>`;

      const detail = document.createElement('div');
      detail.className = 'haki-day-detail';
      detail.hidden = true;

      const actions = document.createElement('div');
      actions.className = 'haki-day-actions';
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'haki-day-new';
      add.textContent = '+ Nueva venta';
      add.addEventListener('click', event => {
        event.stopPropagation();
        openNewSale(date);
      });
      actions.append(add);
      detail.append(actions);

      if (!daySales.length) {
        const empty = document.createElement('div');
        empty.className = 'haki-day-empty';
        empty.textContent = 'No hay ventas registradas este día.';
        detail.append(empty);
      } else {
        daySales.forEach(sale => detail.append(saleMiniCard(sale)));
      }

      toggle.addEventListener('click', () => {
        const open = detail.hidden;
        detail.hidden = !open;
        card.classList.toggle('is-open', open);
      });

      card.append(toggle, detail);
      daysRoot.append(card);
    });
  }

  async function loadPeriod(period = state.salesPeriod) {
    state.salesPeriod = period;
    state.weekStart = period.start;
    try {
      const data = await fetchPeriod(period);
      state.sales = data.sales;
      state.inventory = data.inventory;
      renderPeriod();
      if (typeof renderInventory === 'function') renderInventory();
    } catch (error) {
      toast(error.message || 'No se pudo cargar la semana.', true);
    }
  }

  // Guardar/eliminar usa la semana lunes-domingo actualmente visible.
  loadWeek = async function () {
    return loadPeriod(state.salesPeriod || weekFromDate(new Date()));
  };
  renderWeek = renderPeriod;

  prev?.addEventListener('click', () => loadPeriod(adjacentWeek(state.salesPeriod, -1)));
  next?.addEventListener('click', () => loadPeriod(adjacentWeek(state.salesPeriod, 1)));

  // Después de guardar, abrimos la semana lunes-domingo a la que pertenece la venta.
  const originalSaveSale = saveSale;
  saveSale = async function () {
    const date = document.querySelector('#salePickupDate')?.value;
    if (date) state.salesPeriod = weekFromDate(date);
    return originalSaveSale();
  };

  const originalShowEditor = showEditor;
  showEditor = function () {
    closeMenu();
    originalShowEditor();
  };

  // Carga inicial de la semana actual (lunes a domingo).
  setTimeout(() => loadPeriod(state.salesPeriod), 0);
})();
