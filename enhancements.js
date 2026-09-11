(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const sizes = ['S','M','L','XL'];
  const normalize = (value='') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const products = () => window.HAKI_PRODUCTOS || [];
  const config = () => window.HAKI_CONFIG || {};
  const byCode = code => products().find(p => p.codigo === code);
  const money = n => `${config().moneda || '$'}${Number(n || 0).toFixed(2)}`;
  const soldOut = p => !sizes.some(size => !!p?.tallas?.[size]);

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function labelFor(p) {
    return soldOut(p)
      ? (String(p.etiquetaAgotado || '').trim() || 'Agotado')
      : (String(p.etiquetaDisponible || '').trim() || 'Disponible');
  }

  function applyCardStatuses() {
    $$('.product[data-code]').forEach(card => {
      const p = byCode(card.dataset.code);
      if (!p) return;
      const badge = $('.product-number', card);
      if (!badge) return;
      const out = soldOut(p);
      const text = labelFor(p);
      if (badge.textContent.trim() !== text) badge.textContent = text;
      badge.classList.add('availability-badge');
      badge.classList.toggle('sold-out', out);
    });
  }

  function currentDetailProduct() {
    let hash = '';
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch {}
    return hash.startsWith('producto/') ? byCode(hash.slice(9)) : null;
  }

  function addDetailStatus(p, detail) {
    const media = $('.detail-media', detail);
    if (!media) return;
    let badge = $('.detail-availability', media);
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'detail-availability';
      media.appendChild(badge);
    }
    const out = soldOut(p);
    badge.textContent = labelFor(p);
    badge.classList.toggle('sold-out', out);
  }

  function productType(p) {
    const collections = config().colecciones || [];
    const collectionNames = (p.colecciones || [])
      .map(id => collections.find(c => c.id === id)?.nombre || '')
      .join(' ');
    const haystack = normalize(`${p.nombre || ''} ${p.categoria || ''} ${collectionNames}`);
    if (/accesorio|cinturon|belt|muñequera|strap|gorra|bolso|calcetin/.test(haystack)) return 'accessories';
    if (/pants|pant|jogger|pantalon/.test(haystack)) return 'pants';
    if (/camiseta|centro|camisa|compresion|oversized|top|tee|shirt/.test(haystack)) return 'tops';
    return 'other';
  }

  function complementaryProducts(source) {
    const type = productType(source);
    const allOthers = products().filter(p => p.codigo !== source.codigo);
    let pool = [];

    if (type === 'tops') pool = allOthers.filter(p => productType(p) === 'pants');
    else if (type === 'pants') pool = allOthers.filter(p => productType(p) === 'tops');
    else if (type === 'accessories') pool = allOthers.filter(p => productType(p) !== 'accessories');
    else pool = allOthers.filter(p => productType(p) === 'pants');

    if (!pool.length) pool = allOthers;

    const available = pool.filter(p => !soldOut(p));
    const unavailable = pool.filter(p => soldOut(p));
    return [...available, ...unavailable].slice(0, 4);
  }

  function addComplements(p, detail) {
    const options = $('.detail-options', detail);
    if (!options) return;
    const old = $('.haki-complements', options);
    if (old?.dataset.productCode === p.codigo) return;
    if (old) old.remove();

    const picks = complementaryProducts(p);
    if (!picks.length) return;
    const section = document.createElement('section');
    section.className = 'haki-complements';
    section.dataset.productCode = p.codigo;
    section.setAttribute('aria-labelledby', 'combineTitle');
    section.innerHTML = `
      <div class="haki-complements-head">
        <div><h2 id="combineTitle">COMBÍNALOS</h2><p>Completa tu outfit con estas prendas.</p></div>
      </div>
      <div class="haki-complement-grid">
        ${picks.map(item => `
          <a class="haki-complement-card" href="#producto/${encodeURIComponent(item.codigo)}">
            <div class="haki-complement-image"><img src="${item.imagen || item.imagenRespaldo || 'images/producto.svg'}" alt="${String(item.nombre || '').replace(/"/g,'&quot;')}" loading="lazy"></div>
            <div class="haki-complement-info"><div><span class="haki-complement-code">${item.codigo}</span><span class="haki-complement-name">${item.nombre}</span></div><span class="haki-complement-price">${money(item.precio)}</span></div>
          </a>`).join('')}
      </div>`;
    options.appendChild(section);
  }

  function enhanceDetail() {
    const detail = $('#productDetail');
    if (!detail || detail.hidden) return;
    const p = currentDetailProduct();
    if (!p || !$('.detail-options', detail)) return;
    addDetailStatus(p, detail);
    addComplements(p, detail);
  }

  function quoteText() {
    const cart = (() => { try { return JSON.parse(localStorage.getItem('haki_cart_v1')) || []; } catch { return []; } })();
    const name = $('#customerName')?.value.trim() || '';
    const dept = $('#customerDepartment')?.value.trim() || '';
    const muni = $('#customerMunicipality')?.value.trim() || '';
    const lines = cart.map(i => {
      const p = byCode(i.codigo);
      if (!p) return '';
      return `• ${p.nombre} (${p.codigo}) — Talla ${i.talla} x${i.cantidad} — ${money(p.precio * i.cantidad)}`;
    }).filter(Boolean);
    const total = cart.reduce((sum, i) => sum + ((byCode(i.codigo)?.precio || 0) * i.cantidad), 0);
    return `Hola HAKI 👋\nQuiero solicitar una cotización.\n\nNombre: ${name}\nDepartamento: ${dept}\nMunicipio: ${muni}\n\nProductos:\n${lines.join('\n')}\n\nTotal estimado: ${money(total)}`;
  }

  async function instagramQuote(event) {
    const button = event.target.closest?.('#instagramQuote');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = $('#quoteForm');
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem('haki_cart_v1')) || []; } catch {}
    if (!cart.length) { showToast('Añade al menos una prenda.'); return; }
    if (form && !form.reportValidity()) return;
    const text = quoteText();
    try {
      await navigator.clipboard.writeText(text);
      showToast('Cotización copiada. Abriendo el chat de Instagram.');
    } catch {
      showToast('Abriendo el chat de Instagram.');
    }
    const handle = String(config().instagram || 'haki__sv').replace(/^@/, '');
    window.open(`https://ig.me/m/${encodeURIComponent(handle)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  function autoOpenCartAfterDetailAdd(event) {
    const button = event.target.closest?.('.detail-add');
    const detail = $('#productDetail');
    if (!button || !detail?.contains(button)) return;
    const selected = $('.detail-size.selected:not(:disabled)', detail);
    if (!selected) return;
    setTimeout(() => $('#openCart')?.click(), 0);
  }

  function polishFooter() {
    const serviceLabels = new Map([
      ['encomiendas.html', 'Encomiendas'],
      ['domicilios.html', 'Domicilios'],
      ['cambios-devoluciones.html', 'Cambios']
    ]);
    $$('.footer-service-links a').forEach(link => {
      const file = (link.getAttribute('href') || '').split('/').pop();
      link.textContent = serviceLabels.get(file) || link.textContent.replace(/↗/g, '').trim();
    });
    $$('.footer-links a').forEach(link => {
      link.textContent = link.textContent.replace(/↗/g, '').trim();
    });
  }

  function smoothCategoryDialog() {
    const dialog = $('#categoryMenu');
    if (!dialog || dialog.dataset.smoothPatched) return;
    dialog.dataset.smoothPatched = '1';
    const nativeClose = dialog.close.bind(dialog);
    const nativeShow = dialog.showModal.bind(dialog);
    dialog.close = function(value) {
      if (!dialog.open || dialog.classList.contains('closing')) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { nativeClose(value); return; }
      dialog.classList.add('closing');
      setTimeout(() => { nativeClose(value); dialog.classList.remove('closing'); }, 245);
    };
    dialog.showModal = function() {
      dialog.classList.remove('closing');
      nativeShow();
    };
    dialog.addEventListener('close', () => dialog.classList.remove('closing'));
  }

  let scheduled = false;
  function enhance() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyCardStatuses();
      enhanceDetail();
      polishFooter();
      const help = $('#formHelp');
      if (help) help.textContent = 'Instagram abrirá directamente el chat de HAKI y copiará esta misma cotización para que puedas enviarla.';
    });
  }

  document.addEventListener('click', instagramQuote, true);
  document.addEventListener('click', autoOpenCartAfterDetailAdd);
  smoothCategoryDialog();
  const observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList:true, subtree:true });
  window.addEventListener('hashchange', () => {
    enhance();
    setTimeout(enhance, 40);
  });
  window.addEventListener('load', enhance);
  enhance();
})();
