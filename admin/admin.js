const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const API = '/.netlify/functions';
const RAW_BASE = 'https://raw.githubusercontent.com/henmario99-art/HAKI/main/';

let state = { config: {}, products: [], filtered: [] };

function resolveImage(url='') {
  const value = String(url || '').trim();
  if (!value) return `${RAW_BASE}images/producto.svg`;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const clean = value.replace(/^\/?(?:\.\/)?/, '');
  return `${RAW_BASE}${clean}`;
}

function toast(message, ok=false) {
  const el = $('#globalStatus');
  el.textContent = message;
  el.classList.toggle('ok', ok);
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 3000);
}

async function api(path, options={}) {
  if(path==='upload'&&options.body){
    const body=JSON.parse(options.body);
    if(['image/jpeg','image/png','image/webp'].includes(body.mime)){
      const image=new Image();image.src=`data:${body.mime};base64,${body.base64}`;await image.decode();
      const ratio=Math.min(1,1600/Math.max(image.width,image.height));
      const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
      const data=canvas.toDataURL('image/webp',.84);
      if(data.startsWith('data:image/webp')&&data.length<body.base64.length*1.05){body.base64=data.split(',')[1];body.mime='image/webp';body.name=body.name.replace(/\.[^.]+$/,'')+'.webp';}
      options={...options,body:JSON.stringify(body)};
    }
  }
  const res = await fetch(`${API}/${path}`, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(options.headers||{}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

async function checkAuth() {
  try {
    const data = await api('auth', { method: 'GET' });
    if (data.authenticated) return showAdmin();
  } catch {}
  $('#loginView').hidden = false;
  $('#adminView').hidden = true;
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('#loginStatus');
  status.textContent = 'Entrando…';
  try {
    await api('auth', { method: 'POST', body: JSON.stringify({ password: $('#password').value }) });
    $('#password').value = '';
    status.textContent = '';
    await showAdmin();
  } catch (err) {
    status.textContent = err.message;
  }
});

$('#logoutBtn').addEventListener('click', async () => {
  await api('auth', { method: 'DELETE' }).catch(()=>{});
  location.reload();
});

async function showAdmin() {
  $('#loginView').hidden = true;
  $('#adminView').hidden = false;
  await loadCatalog();
}

async function loadCatalog() {
  $('#saveBtn').disabled = true;
  try {
    const data = await api('catalog', { method: 'GET' });
    state.config = window.hakiSettings(data.config || {});
    state.products = data.products || [];
    fillConfig();
    renderCollectionSettings();
    renderProducts();
    toast('Catálogo cargado', true);
  } catch (err) {
    toast(err.message);
  } finally {
    $('#saveBtn').disabled = false;
  }
}

function fillConfig() {
  document.querySelectorAll('[data-config]').forEach(input => {
    input.value = state.config[input.dataset.config] ?? '';
    input.oninput = () => { state.config[input.dataset.config] = input.type==='number'?Number(input.value):input.value; if(input.dataset.config==='tema')document.documentElement.dataset.theme=input.value; };
    if(input.dataset.config==='tema')document.documentElement.dataset.theme=input.value;
  });
  refreshCoverPreview();
}

function refreshCoverPreview() {
  const preview = $('#coverPreview');
  if (!preview) return;
  const source = state.config.portada || state.config.portadaRespaldo || 'images/hero-fallback.svg';
  preview.onerror = () => {
    preview.onerror = null;
    preview.src = resolveImage('images/hero-fallback.svg');
  };
  preview.src = `${resolveImage(source)}?v=${Date.now()}`;
}

function normalized(value='') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function renderCollectionSettings() {
  state.config.colecciones = window.hakiCollections(state.config);
  const wrap = $('#collectionSettings');
  wrap.replaceChildren();
  state.config.colecciones.forEach((collection, i) => {
    const section = document.createElement('fieldset');
    const legend = document.createElement('legend'); legend.textContent = `Categoría ${i + 1}`;
    section.append(legend);
    [['nombre', 'Nombre'], ['imagen', 'Enlace o ruta de imagen']].forEach(([key, text]) => {
      const label = document.createElement('label'); label.textContent = text;
      const input = document.createElement('input'); input.value = collection[key] || '';
      input.addEventListener('input', () => {
        collection[key] = input.value;
        if (key === 'nombre') $$(`[data-collection-label="${collection.id}"]`).forEach(el => { el.textContent = input.value; });
      });
      label.append(input); section.append(label);
    });
    const uploadLabel = document.createElement('label'); uploadLabel.textContent = 'Subir / reemplazar imagen';
    const upload = document.createElement('input'); upload.type = 'file'; upload.accept = 'image/jpeg,image/png,image/webp,image/gif';
    upload.addEventListener('change', async () => {
      const file = upload.files?.[0]; if (!file) return;
      upload.disabled = true;
      try {
        const data = await api('upload', { method: 'POST', body: JSON.stringify({ name: file.name, mime: file.type, base64: await fileToBase64(file) }) });
        collection.imagen = data.path;
        section.querySelectorAll('input')[1].value = data.path;
        toast('Imagen subida. Guarda el catálogo cuando termines.', true);
      } catch (err) { toast(err.message); }
      finally { upload.disabled = false; upload.value = ''; }
    });
    uploadLabel.append(upload); section.append(uploadLabel); wrap.append(section);
  });
}

function nextId() {
  return state.products.reduce((m,p)=>Math.max(m, Number(p.id)||0), 0) + 1;
}

function newProduct() {
  const id = nextId();
  return {
    id,
    codigo: `HAKI-${String(id).padStart(3,'0')}`,
    nombre: 'Nuevo producto',
    precio: 0,
    categoria: 'Camisetas',
    novedad: false,
    masVendido: false,
    etiquetaMasVendido: 'MÁS VENDIDO',
    colecciones: [],
    colores: [],
    imagen: 'images/producto.svg',
    imagenRespaldo: 'images/producto.svg',
    tallas: { S:true, M:true, L:true, XL:true }
  };
}

function moveProduct(product, nextIndex) {
  const currentIndex = state.products.indexOf(product);
  if (currentIndex < 0 || !state.products.length) return false;
  const targetIndex = Math.max(0, Math.min(state.products.length - 1, Number(nextIndex) || 0));
  if (currentIndex === targetIndex) return false;
  state.products.splice(currentIndex, 1);
  state.products.splice(targetIndex, 0, product);
  return true;
}

let draggedProduct = null;
function renderReorderList() {
  const wrap = $('#reorderList');
  wrap.replaceChildren();

  state.products.forEach((p, index) => {
    const row = document.createElement('article');
    row.className = 'reorder-item';
    row.draggable = true;

    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'reorder-handle';
    handle.textContent = '⠿';
    handle.title = 'Arrastrar para cambiar el orden';
    handle.setAttribute('aria-label', `Mover ${p.nombre || p.codigo}`);

    const image = document.createElement('img');
    image.className = 'reorder-thumb';
    image.alt = '';
    image.loading = 'lazy';
    image.src = resolveImage(p.imagen || p.imagenRespaldo || 'images/producto.svg');
    image.addEventListener('error', () => { image.src = resolveImage('images/producto.svg'); }, { once: true });

    const info = document.createElement('div');
    info.className = 'reorder-info';
    const name = document.createElement('strong');
    name.textContent = p.nombre || 'Sin nombre';
    const code = document.createElement('small');
    code.textContent = p.codigo || 'Sin código';
    info.append(name, code);

    const controls = document.createElement('div');
    controls.className = 'reorder-controls';
    const up = document.createElement('button');
    up.type = 'button'; up.className = 'reorder-move'; up.textContent = '↑'; up.disabled = index === 0;
    up.setAttribute('aria-label', `Subir ${p.nombre || p.codigo}`);
    const down = document.createElement('button');
    down.type = 'button'; down.className = 'reorder-move'; down.textContent = '↓'; down.disabled = index === state.products.length - 1;
    down.setAttribute('aria-label', `Bajar ${p.nombre || p.codigo}`);
    const positionLabel = document.createElement('label');
    positionLabel.className = 'reorder-position';
    const positionText = document.createElement('span');
    positionText.textContent = 'Posición';
    const position = document.createElement('input');
    position.type = 'number'; position.min = '1'; position.max = String(state.products.length); position.value = String(index + 1);
    position.setAttribute('aria-label', `Posición de ${p.nombre || p.codigo}`);
    positionLabel.append(positionText, position);
    controls.append(up, down, positionLabel);
    row.append(handle, image, info, controls);

    up.addEventListener('click', () => { if (moveProduct(p, index - 1)) renderReorderList(); });
    down.addEventListener('click', () => { if (moveProduct(p, index + 1)) renderReorderList(); });
    const applyPosition = () => { if (moveProduct(p, Number(position.value) - 1)) renderReorderList(); else position.value = String(state.products.indexOf(p) + 1); };
    position.addEventListener('change', applyPosition);
    position.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); applyPosition(); } });

    row.addEventListener('dragstart', event => {
      draggedProduct = p;
      row.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(p.codigo || p.id || index));
    });
    row.addEventListener('dragover', event => {
      if (!draggedProduct || draggedProduct === p) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      $$('.is-drop-target', wrap).forEach(item => item.classList.remove('is-drop-target'));
      row.classList.add('is-drop-target');
    });
    row.addEventListener('drop', event => {
      event.preventDefault();
      if (!draggedProduct || draggedProduct === p) return;
      const from = state.products.indexOf(draggedProduct);
      const target = state.products.indexOf(p);
      const after = event.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
      let destination = target + (after ? 1 : 0);
      if (from < destination) destination -= 1;
      moveProduct(draggedProduct, destination);
      draggedProduct = null;
      renderReorderList();
    });
    row.addEventListener('dragend', () => {
      draggedProduct = null;
      $$('.reorder-item', wrap).forEach(item => item.classList.remove('is-dragging', 'is-drop-target'));
    });

    wrap.append(row);
  });
}

function renderProducts() {
  const q = ($('#search').value || '').trim().toLowerCase();
  state.filtered = state.products.filter(p => !q || `${p.codigo} ${p.nombre} ${p.categoria}`.toLowerCase().includes(q));
  $('#count').textContent = `${state.products.length} productos`;
  const wrap = $('#products');
  wrap.innerHTML = '';

  state.filtered.forEach((p) => {
    const tpl = $('#productTemplate').content.cloneNode(true);
    const card = $('.product-card', tpl);
    $('.product-index', tpl).textContent = String(state.products.indexOf(p) + 1).padStart(2,'0');
    $('.product-title', tpl).textContent = p.nombre;

    $$('[data-field]', tpl).forEach(input => {
      const key = input.dataset.field;
      input.value = p[key] ?? '';
      input.addEventListener('input', () => {
        p[key] = key === 'precio' ? Number(input.value) : input.value;
        if (key === 'nombre') $('.product-title', card).textContent = input.value || 'Sin nombre';
        if (key === 'imagen') $('.preview', card).src = `${resolveImage(input.value || p.imagenRespaldo || 'images/producto.svg')}?v=${Date.now()}`;
      });
    });

    $$('[data-size]', tpl).forEach(input => {
      const size = input.dataset.size;
      input.checked = !!p.tallas?.[size];
      input.addEventListener('change', () => {
        p.tallas ||= {};
        p.tallas[size] = input.checked;
      });
    });

    if (!Array.isArray(p.colores)) p.colores = p.color ? [p.color] : [];
    p.colores = [...new Set(p.colores.map(String).filter(Boolean))];
    $$('input[data-color]', tpl).forEach(input => {
      const color = input.dataset.color;
      const swatch = input.closest('.color-swatch');
      input.checked = p.colores.includes(color);
      swatch?.classList.toggle('is-selected', input.checked);
      input.addEventListener('change', () => {
        const colors = new Set(p.colores);
        if (input.checked) colors.add(color); else colors.delete(color);
        p.colores = [...colors];
        swatch?.classList.toggle('is-selected', input.checked);
      });
    });

    const newCheck = $('.new-arrival-check', tpl);
    newCheck.checked = p.novedad === true;
    newCheck.addEventListener('change', () => { p.novedad = newCheck.checked; });
    const bestSellerCheck = $('.best-seller-check', tpl);
    bestSellerCheck.checked = p.masVendido === true;
    bestSellerCheck.addEventListener('change', () => { p.masVendido = bestSellerCheck.checked; });
    const choices = $('.collection-choices', tpl);
    const collections = window.hakiCollections(state.config);
    if (!Array.isArray(p.colecciones)) p.colecciones = collections.filter(c => normalized(p.categoria || '') === normalized(c.categoria || c.nombre)).map(c => c.id);
    collections.forEach(c => {
      const label = document.createElement('label'); label.className = 'check-label';
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = p.colecciones.includes(c.id);
      checkbox.addEventListener('change', () => {
        p.colecciones = p.colecciones.filter(id => id !== c.id);
        if (checkbox.checked) p.colecciones.push(c.id);
      });
      const text = document.createElement('span'); text.dataset.collectionLabel = c.id; text.textContent = c.nombre;
      label.append(checkbox, text); choices.append(label);
    });

    ['imagen2', 'guiaTallas'].forEach(field => {
      const preview = $(`[data-preview="${field}"]`, tpl);
      const fieldInput = $(`[data-field="${field}"]`, tpl);
      function refresh() { preview.hidden = !p[field]; if (p[field]) preview.src = resolveImage(p[field]); }
      refresh(); fieldInput.addEventListener('input', refresh);
      $(`[data-clear-image="${field}"]`, tpl).addEventListener('click', () => { p[field] = ''; fieldInput.value = ''; refresh(); });
      const upload = $(`[data-image-field="${field}"]`, tpl);
      upload.addEventListener('change', async () => {
        const file = upload.files?.[0]; if (!file) return;
        upload.disabled = true;
        try {
          toast('Subiendo imagen…');
          const data = await api('upload', { method: 'POST', body: JSON.stringify({ name: file.name, mime: file.type, base64: await fileToBase64(file) }) });
          p[field] = data.path; fieldInput.value = data.path; refresh();
          toast('Imagen subida. Guarda los cambios al terminar.', true);
        } catch (error) { toast(error.message); }
        finally { upload.disabled = false; upload.value = ''; }
      });
    });

    const preview = $('.preview', tpl);
    preview.loading = 'lazy';
    preview.src = `${resolveImage(p.imagen || p.imagenRespaldo || 'images/producto.svg')}?v=${Date.now()}`;
    preview.onerror = () => {
      preview.onerror = null;
      preview.src = `${resolveImage(p.imagenRespaldo || 'images/producto.svg')}?v=${Date.now()}`;
    };

    $('.remove-btn', tpl).addEventListener('click', () => {
      if (!confirm(`¿Eliminar ${p.nombre}?`)) return;
      state.products = state.products.filter(x => x !== p);
      renderProducts();
    });

    $('.image-file', tpl).addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        e.target.disabled = true;
        toast('Subiendo imagen…');
        const base64 = await fileToBase64(file);
        const data = await api('upload', {
          method: 'POST',
          body: JSON.stringify({ name: file.name, mime: file.type, base64 })
        });
        p.imagen = data.path;
        const imageInput = $('[data-field="imagen"]', card);
        imageInput.value = data.path;
        preview.src = `${resolveImage(data.path)}?v=${Date.now()}`;
        toast('Imagen subida a GitHub. No requiere deploy. Guarda el catálogo cuando termines.', true);
      } catch (err) {
        toast(err.message);
      } finally {
        e.target.disabled = false;
        e.target.value = '';
      }
    });

    wrap.appendChild(tpl);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

$('#coverFile')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    e.target.disabled = true;
    toast('Subiendo foto de portada…');
    const data = await api('upload', {
      method: 'POST',
      body: JSON.stringify({ name: file.name, mime: file.type, base64: await fileToBase64(file) })
    });
    state.config.portada = data.path;
    state.config.portadaRespaldo = data.path;
    const pathInput = $('#coverPath');
    if (pathInput) pathInput.value = data.path;
    refreshCoverPreview();
    toast('Foto de portada subida. Pulsa “Guardar y publicar” para aplicarla.', true);
  } catch (err) {
    toast(err.message);
  } finally {
    e.target.disabled = false;
    e.target.value = '';
  }
});

$('#search').addEventListener('input', renderProducts);

const reorderDialog = $('#reorderDialog');
$('#reorderBtn').addEventListener('click', () => {
  renderReorderList();
  reorderDialog.showModal();
});
function closeReorderDialog() { reorderDialog.close(); }
$('#closeReorderBtn').addEventListener('click', closeReorderDialog);
$('#closeReorderFooterBtn').addEventListener('click', closeReorderDialog);
reorderDialog.addEventListener('click', event => { if (event.target === reorderDialog) closeReorderDialog(); });
reorderDialog.addEventListener('close', renderProducts);

$('#addBtn').addEventListener('click', () => {
  const p = newProduct();
  state.products.unshift(p);
  $('#search').value = '';
  renderProducts();
  window.scrollTo({ top: document.querySelector('.section-title').offsetTop - 80, behavior: 'smooth' });
});

async function saveCatalog() {
  for (const input of document.querySelectorAll('#experienceSettings input')) { if (!input.reportValidity()) return; }
  if (!confirm('¿Guardar estos cambios en el catálogo?')) return false;
  const buttons = [$('#saveBtn'), $('#saveOrderBtn')];
  buttons.forEach(button => { button.disabled = true; button.dataset.label = button.textContent; button.textContent = 'Guardando…'; });
  try {
    await api('catalog', {
      method: 'PUT',
      body: JSON.stringify({ config: state.config, products: state.products })
    });
    toast('Cambios guardados en GitHub. El catálogo los leerá sin un deploy de producción.', true);
    setTimeout(loadCatalog, 1200);
    return true;
  } catch (err) {
    toast(err.message);
    return false;
  } finally {
    buttons.forEach(button => { button.disabled = false; button.textContent = button.dataset.label || 'Guardar y publicar'; });
  }
}

$('#saveBtn').addEventListener('click', saveCatalog);
$('#saveOrderBtn').addEventListener('click', async () => { if (await saveCatalog()) closeReorderDialog(); });

checkAuth();
