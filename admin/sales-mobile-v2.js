(() => {
  if (typeof api !== 'function' || typeof state !== 'object') return;

  const salesView = document.querySelector('#salesView');
  const daysRoot = document.querySelector('#days');
  const metrics = document.querySelector('.metrics');
  const toolbar = document.querySelector('.week-toolbar');
  const tabs = document.querySelector('.sales-tabs');
  const topbar = document.querySelector('.sales-topbar');
  if (!salesView || !daysRoot || !metrics || !toolbar || !tabs || !topbar) return;

  const pad = n => String(n).padStart(2, '0');
  const dateIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const asDate = iso => new Date(`${iso}T12:00:00`);
  const lastDayOfMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const saleNet = sale => Math.max(0, Number(((Number(sale?.total) || 0) - (Number(sale?.comisionC807) || 0)).toFixed(2)));
  const activeSale = sale => !['Cancelado', 'No retirado'].includes(sale?.estado);
  const statePill = value => value === 'Retirado' ? 'done' : (value === 'Cancelado' || value === 'No retirado' ? 'cancelled' : 'pending');

  function periodFromDate(value) {
    const date = value instanceof Date ? new Date(value) : asDate(value);
    const y = date.getFullYear();
    const m = date.getMonth();
    const day = date.getDate();
    const index = Math.floor((day - 1) / 7) + 1;
    const startDay = (index - 1) * 7 + 1;
    const endDay = Math.min(startDay + 6, lastDayOfMonth(y, m));
    return {
      year: y,
      month: m,
      index,
      start: dateIso(y, m, startDay),
      end: dateIso(y, m, endDay),
      startDay,
      endDay,
    };
  }

  function adjacentPeriod(period, direction) {
    if (direction < 0) {
      if (period.startDay > 1) return periodFromDate(dateIso(period.year, period.month, period.startDay - 1));
      const prev = new Date(period.year, period.month, 0);
      return periodFromDate(prev);
    }
    const last = lastDayOfMonth(period.year, period.month);
    if (period.endDay < last) return periodFromDate(dateIso(period.year, period.month, period.endDay + 1));
    return periodFromDate(new Date(period.year, period.month + 1, 1));
  }

  state.salesPeriod = periodFromDate(new Date());

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
      <button class="haki-admin-menu-item" type="button" data-open-panel="collections"><span class="haki-admin-menu-icon">▣</span><span>Cobro</span><span class="haki-admin-menu-arrow">›</span></button>
      <button class="haki-admin-menu-item" type="button" data-open-panel="expenses"><span class="haki-admin-menu-icon">◉</span><span>Gasto</span><span class="haki-admin-menu-arrow">›</span></button>
      <button class="haki-admin-menu-item" type="button" data-open-panel="dashboard"><span class="haki-admin-menu-icon">▥</span><span>Dashboard</span><span class="haki-admin-menu-arrow">›</span></button>
    </div>`;
  document.body.append(backdrop, menu);

  function closeMenu() {
    menu.hidden = true;
    backdrop.hidden = true;
    salesTab?.querySelector('.haki-sales-menu-toggle')?.setAttribute('aria-expanded', 'false');
  }
  function toggleMenu() {
    const next = !menu.hidden;
    menu.hidden = !next;
    backdrop.hidden = !next;
    salesTab?.querySelector('.haki-sales-menu-toggle')?.setAttribute('aria-expanded', String(next));
  }
  backdrop.addEventListener('click', closeMenu);
  salesTab?.addEventListener('click', event => {
    // El mismo control mantiene Ventas activo y despliega las herramientas administrativas.
    setTimeout(toggleMenu, 0);
  });
  menu.querySelectorAll('[data-open-panel]').forEach(button => {
    button.addEventListener('click', () => {
      closeMenu();
      const panel = button.dataset.openPanel;
      secondaryTabs.find(tab => tab.dataset.tab === panel)?.click();
      document.body.classList.add('haki-suite-open');
    });
  });
  salesTab?.addEventListener('click', () => document.body.classList.remove('haki-suite-open'));
  inventoryTab?.addEventListener('click', () => { closeMenu(); document.body.classList.remove('haki-suite-open'); });

  // ---------- Métricas inferiores ----------
  metrics.classList.add('haki-bottom-metrics');
  salesView.classList.add('haki-sales-home');
  daysRoot.classList.add('haki-days-list');
  salesView.append(metrics);
  const metricCards = [...metrics.querySelectorAll('article')];
  if (metricCards[0]) metricCards[0].querySelector('span').textContent = 'Vendido';
  if (metricCards[1]) metricCards[1].querySelector('span').textContent = 'Pendiente';
  if (metricCards[2]) metricCards[2].querySelector('span').textContent = 'A cobrar';
  if (metricCards[3]) metricCards[3].querySelector('span').textContent = 'Pedidos';

  // ---------- Selector de semana mensual ----------
  toolbar.classList.add('haki-period-toolbar');
  const prevButton = document.querySelector('#prevWeek');
  const nextButton = document.querySelector('#nextWeek');
  const todayButton = document.querySelector('#todayWeek');
  const newSaleButton = document.querySelector('#newSale');

  // Reemplazamos los botones para retirar los listeners semanales antiguos (lunes-domingo).
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
    const dates = [];
    for (let day = period.startDay; day <= period.endDay; day += 1) dates.push(dateIso(period.year, period.month, day));
    return dates;
  }

  async function fetchPeriod(period) {
    const dates = periodDates(period);
    const mondayStarts = [...new Set(dates.map(date => mondayOf(date)))];
    const responses = await Promise.all(mondayStarts.map(start => api(`sales?weekStart=${encodeURIComponent(start)}`, { method: 'GET' })));
    const byId = new Map();
    responses.forEach(response => (response.sales || []).forEach(sale => byId.set(String(sale.id), sale)));
    const allowed = new Set(dates);
    const sales = [...byId.values()].filter(sale => allowed.has(sale.fecha));
    const inventory = responses.find(response => response.inventory)?.inventory || state.inventory || {};
    return { sales, inventory };
  }

  function renderMetrics() {
    const active = state.sales.filter(activeSale);
    const sold = active.reduce((sum, sale) => sum + saleNet(sale), 0);
    const pendingOrders = active.filter(sale => sale.estado === 'Pendiente').length;
    const toCollect = active.filter(sale => sale.dinero === 'Pendiente').reduce((sum, sale) => sum + saleNet(sale), 0);
    const orders = active.length;
    if (metricCards[0]) metricCards[0].querySelector('strong').textContent = money(sold);
    if (metricCards[1]) metricCards[1].querySelector('strong').textContent = String(pendingOrders);
    if (metricCards[2]) metricCards[2].querySelector('strong').textContent = money(toCollect);
    if (metricCards[3]) metricCards[3].querySelector('strong').textContent = String(orders);
  }

  function saleMiniCard(sale) {
    const card = document.createElement('article');
    card.className = 'haki-sale-mini';
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
    if (range) range.textContent = '';

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
        <span class="haki-day-icon">▣</span>
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
      add.addEventListener('click', event => { event.stopPropagation(); openNewSale(date); });
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
    // state.weekStart se mantiene como lunes técnico para ediciones/API; la UI usa salesPeriod.
    state.weekStart = mondayOf(period.start);
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

  // Cualquier guardado/eliminación que invoque loadWeek vuelve al bloque mensual seleccionado.
  loadWeek = async function () {
    return loadPeriod(state.salesPeriod || periodFromDate(new Date()));
  };
  renderWeek = renderPeriod;

  prev?.addEventListener('click', () => loadPeriod(adjacentPeriod(state.salesPeriod, -1)));
  next?.addEventListener('click', () => loadPeriod(adjacentPeriod(state.salesPeriod, 1)));

  // Después de guardar una venta, si la fecha quedó fuera del bloque visible, saltamos a su bloque.
  const originalSaveSale = saveSale;
  saveSale = async function () {
    const date = document.querySelector('#salePickupDate')?.value;
    if (date) state.salesPeriod = periodFromDate(date);
    return originalSaveSale();
  };

  // Si una edición se abre desde un día, no dejamos que la navegación superior interfiera con la vista independiente.
  const originalShowEditor = showEditor;
  showEditor = function () {
    closeMenu();
    originalShowEditor();
  };

  // Carga inicial usando 1-7, 8-14, 15-21, 22-28 y 29-fin de mes.
  setTimeout(() => loadPeriod(state.salesPeriod), 0);
})();
