const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const API = '/.netlify/functions';

let state = { config: {}, products: [], filtered: [] };

function toast(message, ok=false) {
  const el = $('#globalStatus');
  el.textContent = message;
  el.classList.toggle('ok', ok);
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 3000);
}

async function api(path, options={}) {
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
    state.config = data.config || {};
    state.products = data.products || [];
    fillConfig();
    renderProducts();
    toast('Catálogo cargado', true);
  } catch (err) {
    toast(err.message);
  } finally {
    $('#saveBtn').disabled = false;
  }
}

function fillConfig() {
  $$('[data-config]').forEach(input => {
    input.value = state.config[input.dataset.config] ?? '';
    input.oninput = () => state.config[input.dataset.config] = input.value;
  });
}

function nextId() {
  return state.products.reduce((m,p)=>Math.max(m, Number(p.id)||0), 0) + 1;
}

function newProduct() {
  return {
    id: nextId(),
    codigo: `HAKI-${String(nextId()).padStart(3,'0')}`,
    nombre: 'Nuevo producto',
    precio: 0,
    categoria: 'Camisetas',
    imagen: 'images/producto.svg',
    imagenRespaldo: 'images/producto.svg',
    tallas: { S:true, M:true, L:true, XL:true }
  };
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
    $('.product-index', tpl).textContent = String(p.id).padStart(2,'0');
    $('.product-title', tpl).textContent = p.nombre;

    $$('[data-field]', tpl).forEach(input => {
      const key = input.dataset.field;
      input.value = p[key] ?? '';
      input.addEventListener('input', () => {
        p[key] = key === 'precio' ? Number(input.value) : input.value;
        if (key === 'nombre') $('.product-title', card).textContent = input.value || 'Sin nombre';
        if (key === 'imagen') $('.preview', card).src = input.value || p.imagenRespaldo || 'images/producto.svg';
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

    const preview = $('.preview', tpl);
    preview.src = p.imagen || p.imagenRespaldo || 'images/producto.svg';
    preview.onerror = () => { preview.onerror = null; preview.src = p.imagenRespaldo || 'images/producto.svg'; };

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
        preview.src = `${data.path}?v=${Date.now()}`;
        toast('Imagen subida. Pulsa Guardar y publicar para guardar el producto.', true);
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

$('#search').addEventListener('input', renderProducts);

$('#addBtn').addEventListener('click', () => {
  const p = newProduct();
  state.products.unshift(p);
  $('#search').value = '';
  renderProducts();
  window.scrollTo({ top: document.querySelector('.section-title').offsetTop - 80, behavior: 'smooth' });
});

$('#saveBtn').addEventListener('click', async () => {
  if (!confirm('¿Guardar y publicar estos cambios en el catálogo?')) return;
  $('#saveBtn').disabled = true;
  $('#saveBtn').textContent = 'Publicando…';
  try {
    const data = await api('catalog', {
      method: 'PUT',
      body: JSON.stringify({ config: state.config, products: state.products })
    });
    toast('Cambios guardados. Netlify publicará la nueva versión automáticamente.', true);
    setTimeout(loadCatalog, 1200);
  } catch (err) {
    toast(err.message);
  } finally {
    $('#saveBtn').disabled = false;
    $('#saveBtn').textContent = 'Guardar y publicar';
  }
});

checkAuth();
