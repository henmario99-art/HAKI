const HAKI_SIZE_GUIDES = [
  ['compression', 'Compresión'], ['oversized', 'Oversized'],
  ['pants', 'Pants'], ['shorts', 'Shorts']
];

function defaultProductGuide(product) {
  const clean = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const collections = window.hakiCollections(state.config).filter(c => (product.colecciones || []).includes(c.id));
  const category = clean(product.categoria);
  const names = clean(collections.map(c => c.nombre).join(' '));
  if (/oversiz/.test(names + ' ' + category)) return 'oversized';
  if (/short|calzoneta|bermuda/.test(category)) return 'shorts';
  if (/pant|jogger/.test(category)) return 'pants';
  if (/short|calzoneta|bermuda/.test(names) && !/pant|jogger/.test(names)) return 'shorts';
  if (/pant|jogger/.test(names) && !/short|calzoneta|bermuda/.test(names)) return 'pants';
  return 'compression';
}

function setupProductGuide(product, root) {
  const select = root.querySelector('.product-guide-select');
  if (!select) return;
  const selectedGuide=HAKI_SIZE_GUIDES.some(([key]) => key === product.tipoGuiaTallas)?product.tipoGuiaTallas:defaultProductGuide(product);
  select.replaceChildren(...HAKI_SIZE_GUIDES.map(([key, name]) => {
    const option = document.createElement('option');
    option.value = key; option.textContent = name;
    return option;
  }));
  select.value = selectedGuide;
  select.addEventListener('change', () => { product.tipoGuiaTallas = select.value; });
}

function setupColorParentPicker(product, root) {
  const trigger = root.querySelector('.color-parent-button');
  if (!trigger) return;
  const code = p => String(p?.codigo || '').trim().toUpperCase();
  const parent = () => state.products.find(p => p !== product && code(p) === product.colorDe);
  function label() {
    trigger.replaceChildren();
    const selected = parent();
    if (selected) {
      const img = document.createElement('img');
      img.src = resolveImage(selected.imagen || selected.imagenRespaldo);
      img.alt = ''; img.className = 'variant-trigger-thumb';
      trigger.append(img);
    }
    const copy = document.createElement('span');
    copy.textContent = selected ? selected.nombre || selected.codigo : 'Prenda principal / no agrupar';
    trigger.append(copy);
    const arrow = document.createElement('span'); arrow.textContent = '⌄'; arrow.setAttribute('aria-hidden', 'true');
    trigger.append(arrow);
  }
  label();
  trigger.addEventListener('click', () => {
    let dialog = document.getElementById('colorParentDialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'colorParentDialog'; dialog.className = 'variant-dialog color-parent-dialog';
      dialog.setAttribute('aria-labelledby', 'colorParentTitle');
      dialog.innerHTML = '<header class="variant-head"><h2 id="colorParentTitle">Prenda principal</h2><button type="button" class="reorder-close" aria-label="Cerrar">×</button></header><div class="variant-search-wrap"><input type="search" class="variant-search" placeholder="Buscar por nombre o código" aria-label="Buscar prenda principal" autocomplete="off"></div><div class="variant-options"></div>';
      document.body.append(dialog);
      dialog.querySelector('header button').onclick = () => dialog.close();
      dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    }
    const search = dialog.querySelector('.variant-search');
    const list = dialog.querySelector('.variant-options');
    const normalized = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    function render() {
      list.replaceChildren();
      const query = normalized(search.value.trim());
      function option(candidate) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'variant-option';
        button.dataset.code = candidate ? code(candidate) : '';
        button.setAttribute('aria-pressed', String(button.dataset.code === product.colorDe));
        if (candidate) {
          const img = document.createElement('img'); img.loading = 'lazy'; img.alt = candidate.nombre || candidate.codigo;
          img.src = resolveImage(candidate.imagen || candidate.imagenRespaldo);
          img.onerror = () => { img.onerror = null; img.src = resolveImage('images/producto.svg'); };
          const copy = document.createElement('span');
          const name = document.createElement('strong'); name.textContent = candidate.nombre || 'Sin nombre';
          const number = document.createElement('small'); number.textContent = candidate.codigo;
          copy.append(name, number); button.append(img, copy);
        } else {
          const thumb=document.createElement('span');thumb.className='variant-empty-thumb';thumb.setAttribute('aria-hidden','true');thumb.innerHTML=hakiIcon('box');
          const copy=document.createElement('span');const name=document.createElement('strong');name.textContent='Prenda principal / no agrupar';copy.append(name);button.append(thumb,copy);
        }
        const choice=document.createElement('span');choice.className='variant-choice';choice.setAttribute('aria-hidden','true');choice.textContent=button.dataset.code===product.colorDe?'✓':'';button.append(choice);
        button.onclick = () => { product.colorDe = button.dataset.code; label(); dialog.close(); };
        list.append(button);
      }
      option(null);
      const candidates = state.products.filter(p => p !== product && code(p) && normalized(p.nombre + ' ' + p.codigo).includes(query));
      candidates.forEach(option);
      if (!candidates.length) { const empty = document.createElement('p'); empty.textContent = 'No se encontraron prendas.'; list.append(empty); }
    }
    search.value = ''; search.oninput = render; render();
    dialog.showModal();
    // Keep the keyboard closed until the search field is selected manually.
    dialog.querySelector('header button').focus();
  });
}
