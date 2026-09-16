(() => {
  const admin = document.getElementById('adminView');
  if (!admin) return;

  function cardByTitle(text) {
    return [...admin.querySelectorAll('.config-card')].find(card => {
      const heading = card.querySelector(':scope > h2');
      return heading && heading.textContent.trim().toLowerCase() === text.toLowerCase();
    });
  }

  function prepareToolbar() {
    const toolbar = admin.querySelector('.toolbar');
    if (!toolbar) return;
    toolbar.classList.add('admin-home-toolbar');

    const search = document.getElementById('search');
    const add = document.getElementById('addBtn');
    const reorder = document.getElementById('reorderBtn');
    const products = document.getElementById('jumpProductsBtn');
    const save = document.getElementById('saveBtn');

    if (search) {
      search.placeholder = 'Buscar producto o código';
      search.classList.add('admin-home-search');
    }
    if (products) {
      products.textContent = 'Productos';
      products.classList.add('admin-home-action');
    }
    if (reorder) {
      reorder.textContent = '↕ Ordenar';
      reorder.classList.add('admin-home-action');
    }
    if (add) {
      add.textContent = '+ Agregar';
      add.classList.add('admin-home-action');
    }
    if (save) {
      save.textContent = 'Guardar';
      save.classList.add('admin-home-save');
    }

    [search, products, reorder, add, save].filter(Boolean).forEach(node => toolbar.append(node));
  }

  function prepareTopbar() {
    const topbar = admin.querySelector('.topbar');
    if (!topbar) return;
    topbar.classList.add('admin-home-topbar');
    topbar.querySelector(':scope > div:first-child > p')?.classList.add('admin-home-subtitle');

    const sales = topbar.querySelector('.admin-sales-link');
    if (sales) {
      sales.textContent = 'Ventas';
      sales.classList.add('admin-home-sales');
    }
    topbar.querySelector('a[href="/"]')?.classList.add('admin-home-catalog-link');
    document.getElementById('logoutBtn')?.classList.add('admin-home-logout');
  }

  function mergeCategoriesIntoGeneral() {
    const general = document.getElementById('generalSettingsCard') || cardByTitle('Configuración general');
    const categories = document.getElementById('homeCategoriesCard') || cardByTitle('Las cuatro categorías de inicio');
    if (general) general.id = 'generalSettingsCard';
    if (categories) categories.id = 'homeCategoriesCard';
    if (!general || !categories || general.dataset.categoriesMerged === '1') return;

    const details = document.createElement('details');
    details.className = 'admin-nested-settings';
    const summary = document.createElement('summary');
    summary.textContent = 'Categorías de inicio';
    details.append(summary);
    [...categories.childNodes].forEach(node => {
      if (node.nodeType === 1 && node.tagName === 'H2') return;
      details.append(node);
    });

    general.append(details);
    general.dataset.categoriesMerged = '1';
    categories.remove();
  }

  function accordionize(card, titleOverride) {
    if (!card || card.dataset.homeAccordion === '1') return;
    const heading = card.querySelector(':scope > h2');
    if (!heading) return;

    const title = titleOverride || heading.textContent.trim();
    const body = document.createElement('div');
    body.className = 'admin-accordion-body';
    body.hidden = true;

    [...card.childNodes].forEach(node => {
      if (node === heading) return;
      body.append(node);
    });

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'admin-accordion-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = `<span>${title}</span><span class="admin-accordion-chevron" aria-hidden="true">⌄</span>`;
    toggle.addEventListener('click', () => {
      const open = body.hidden;
      body.hidden = !open;
      card.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });

    heading.replaceWith(toggle);
    card.append(body);
    card.classList.add('admin-home-accordion');
    card.dataset.homeAccordion = '1';
  }

  function organizeSettings() {
    mergeCategoriesIntoGeneral();

    const general = document.getElementById('generalSettingsCard') || cardByTitle('Configuración general');
    if (general) general.id = 'generalSettingsCard';
    const experience = document.getElementById('experienceSettings');
    const typography = document.getElementById('typographySettings');
    const gymrat = document.getElementById('gymratSettings');
    const info = [...admin.querySelectorAll('.config-card')].find(card => {
      if (card.id === 'experienceSettings' || card.id === 'typographySettings' || card.id === 'gymratSettings' || card.id === 'generalSettingsCard') return false;
      const heading = card.querySelector(':scope > h2');
      return heading && /encomiendas|domicilios|cambios/i.test(heading.textContent);
    });
    if (info) info.id = 'shippingChangesSettings';

    accordionize(general, 'Configuración general');
    accordionize(experience, 'Apariencia, portada y carrito');
    accordionize(typography, 'Tipografía por tipo de texto');
    accordionize(gymrat, 'GYMRAT TEST');
    accordionize(info, 'Envíos y cambios');

    const products = document.getElementById('productsSection');
    if (!products) return;
    [general, experience, typography, gymrat, info].filter(Boolean).forEach(card => {
      products.parentElement.insertBefore(card, products);
    });
  }

  function enhance() {
    if (admin.hidden) return;
    prepareTopbar();
    prepareToolbar();
    organizeSettings();
  }

  const observer = new MutationObserver(() => requestAnimationFrame(enhance));
  observer.observe(admin, { childList: true, subtree: true });
  setInterval(enhance, 500);
  enhance();
})();
