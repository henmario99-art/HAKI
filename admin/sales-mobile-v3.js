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

  function applyLabels() {
    const stored = storedForCurrentPeriod();
    if (title && document.activeElement !== title) title.textContent = stored.week || defaultWeekLabel();
    if (month && document.activeElement !== month) month.textContent = stored.month || defaultMonthLabel();
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

  // Cuando se navega a otra semana, sales-mobile-v2 actualiza los textos.
  // El observador aplica solo la etiqueta personalizada de esa semana; nunca
  // toca las fechas ni los datos que se cargan de lunes a domingo.
  const observer = new MutationObserver(() => {
    if (document.activeElement === title || document.activeElement === month) return;
    requestAnimationFrame(applyLabels);
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
