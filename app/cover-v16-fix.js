(() => {
  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const byCollection = id => (window.HAKI_PRODUCTOS || []).find(product =>
    Array.isArray(product.colecciones) && product.colecciones.includes(id)
  );

  const fresh = url => {
    if (!url) return '';
    try {
      return typeof window.hakiImage === 'function' ? window.hakiImage(url, 800) : url;
    } catch {
      return url;
    }
  };

  function updateCategoryMenu() {
    const menu = document.querySelector('#categoryMenu nav');
    if (!menu) return;
    menu.innerHTML = `
      <a href="#coleccion/collection-1"><span class="menu-link-label">Camisas y Centros</span><span aria-hidden="true">→</span></a>
      <a href="#coleccion/collection-2"><span class="menu-link-label">Manga Larga</span><span aria-hidden="true">→</span></a>
      <a href="#coleccion/collection-3"><span class="menu-link-label">Shorts y Pants</span><span aria-hidden="true">→</span></a>
      <a href="#coleccion/collection-4"><span class="menu-link-label">Oversized</span><span aria-hidden="true">→</span></a>
      <button id="openGlobalSizeGuide" class="menu-nav-button" type="button"><span class="menu-link-label">Guía de tallas</span><span aria-hidden="true">→</span></button>
      <a href="encomiendas.html"><span class="menu-link-label">Encomiendas</span><span aria-hidden="true">→</span></a>
      <a href="domicilios.html"><span class="menu-link-label">Domicilios</span><span aria-hidden="true">→</span></a>
      <a href="cambios-devoluciones.html"><span class="menu-link-label">Cambios</span><span aria-hidden="true">→</span></a>`;
  }

  function renderFixedCollections() {
    const section = document.getElementById('collectionsSection');
    const grid = document.getElementById('collectionsGrid');
    const title = document.getElementById('collectionsTitle');
    if (!section || !grid) return;

    const heading = section.querySelector('.section-heading .app-eyebrow');
    if (heading) heading.textContent = 'ENCUENTRA TU ESTILO';
    if (title) title.textContent = 'CATEGORÍAS';

    const tiles = [
      { label: 'CAMISAS Y CENTROS', href: '#coleccion/collection-1', image: byCollection('collection-1')?.imagen },
      { label: 'MANGA LARGA', href: '#coleccion/collection-2', image: byCollection('collection-2')?.imagen },
      { label: 'SHORTS Y PANTS', href: '#coleccion/collection-3', image: byCollection('collection-3')?.imagen },
      { label: 'OVERSIZED', href: '#coleccion/collection-4', image: byCollection('collection-4')?.imagen }
    ];

    grid.innerHTML = tiles.map(tile => `
      <a class="collection-tile" href="${tile.href}">
        <div class="collection-image">${tile.image ? `<img src="${fresh(tile.image)}" alt="${tile.label}" loading="eager" decoding="async">` : ''}</div>
        <h3>${tile.label}</h3>
      </a>`).join('');
  }

  function enforceCoverText() {
    const heroTitle = document.getElementById('heroTitle');
    const heroDesc = document.getElementById('heroDescription');
    const search = document.getElementById('desktopSearch');
    if (heroTitle) heroTitle.textContent = 'HAKI';
    if (heroDesc) heroDesc.textContent = 'Haki | Anime & Sports | El Salvador';
    if (search) search.placeholder = 'BUSCAR PRENDA...';
  }

  function bindMenuDelegation() {
    document.addEventListener('click', event => {
      const guideButton = event.target.closest('#openGlobalSizeGuide');
      if (guideButton) {
        event.preventDefault();
        document.getElementById('sizeGuideDialog')?.showModal?.();
      }
      const menuLink = event.target.closest('#categoryMenu a');
      if (menuLink) {
        document.getElementById('categoryMenu')?.close?.();
      }
    });
  }

  function apply() {
    try { if (window.HAKI_CONFIG) window.HAKI_CONFIG.tituloColecciones = 'CATEGORÍAS'; } catch {}
    enforceCoverText();
    renderFixedCollections();
    updateCategoryMenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
    document.addEventListener('DOMContentLoaded', bindMenuDelegation, { once: true });
  } else {
    apply();
    bindMenuDelegation();
  }
  window.addEventListener('load', apply);
  window.addEventListener('pageshow', apply);
  window.addEventListener('haki:catalog-updated', apply);
})();
