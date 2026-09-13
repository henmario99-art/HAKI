(() => {
  const infoQ = (selector, el = document) => el.querySelector(selector);
  const DEFINITIONS = [
    { key: 'encomiendas', label: 'Encomiendas', title: 'ENCOMIENDAS' },
    { key: 'domicilios', label: 'Domicilios', title: 'DOMICILIOS' },
    { key: 'cambios', label: 'Cambios', title: 'CAMBIOS' }
  ];

  let lastConfig = null;

  function ensureInfoConfig() {
    state.config.informacion ||= {};
    DEFINITIONS.forEach(def => {
      const section = state.config.informacion[def.key] || {};
      section.titulo = section.titulo || def.title;
      section.texto = section.texto || '';
      if (!Array.isArray(section.imagenes)) {
        section.imagenes = section.imagen ? [section.imagen] : [];
      }
      delete section.imagen;
      state.config.informacion[def.key] = section;
    });
  }

  function imageRow(section, index, fieldset) {
    const row = document.createElement('div');
    row.className = 'extra-media';
    const cell = document.createElement('div');

    const preview = document.createElement('img');
    preview.className = 'extra-preview';
    preview.alt = `Imagen ${index + 1}`;
    preview.src = resolveImage(section.imagenes[index]);

    const input = document.createElement('input');
    input.value = section.imagenes[index] || '';
    input.placeholder = 'Enlace o ruta de imagen';
    input.addEventListener('input', () => {
      section.imagenes[index] = input.value.trim();
      preview.src = resolveImage(section.imagenes[index]);
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'ghost';
    remove.textContent = 'Quitar imagen';
    remove.addEventListener('click', () => {
      section.imagenes.splice(index, 1);
      renderImages(section, fieldset);
    });

    cell.append(preview, input, remove);
    row.append(cell);
    return row;
  }

  function renderImages(section, fieldset) {
    const holder = infoQ('.info-images-list', fieldset);
    holder.replaceChildren();
    section.imagenes.forEach((_, index) => holder.append(imageRow(section, index, fieldset)));
    infoQ('.info-empty-images', fieldset).hidden = section.imagenes.length > 0;
  }

  function makeSection(def) {
    const section = state.config.informacion[def.key];
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = def.label;
    fieldset.append(legend);

    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Título';
    const titleInput = document.createElement('input');
    titleInput.value = section.titulo || def.title;
    titleInput.addEventListener('input', () => { section.titulo = titleInput.value; });
    titleLabel.append(titleInput);

    const textLabel = document.createElement('label');
    textLabel.textContent = 'Texto';
    const textarea = document.createElement('textarea');
    textarea.rows = 8;
    textarea.placeholder = 'Escribe aquí toda la información que verá el cliente. Puedes separar párrafos dejando una línea en blanco.';
    textarea.value = section.texto || '';
    textarea.addEventListener('input', () => { section.texto = textarea.value; });
    textLabel.append(textarea);

    const imagesTitle = document.createElement('strong');
    imagesTitle.textContent = 'Imágenes';
    const empty = document.createElement('p');
    empty.className = 'info-empty-images';
    empty.textContent = 'Todavía no has agregado imágenes.';
    empty.style.color = '#777';
    empty.style.fontSize = '13px';

    const imagesList = document.createElement('div');
    imagesList.className = 'info-images-list';

    const addUrlWrap = document.createElement('div');
    addUrlWrap.className = 'grid';
    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'Agregar imagen por enlace';
    const urlInput = document.createElement('input');
    urlInput.placeholder = 'https://... o images/archivo.webp';
    urlLabel.append(urlInput);
    const addUrl = document.createElement('button');
    addUrl.type = 'button';
    addUrl.className = 'ghost';
    addUrl.textContent = '+ Agregar enlace';
    addUrl.style.alignSelf = 'end';
    addUrl.addEventListener('click', () => {
      const value = urlInput.value.trim();
      if (!value) return;
      section.imagenes.push(value);
      urlInput.value = '';
      renderImages(section, fieldset);
    });
    addUrlWrap.append(urlLabel, addUrl);

    const uploadLabel = document.createElement('label');
    uploadLabel.className = 'upload-label';
    uploadLabel.textContent = 'Subir una imagen';
    const upload = document.createElement('input');
    upload.type = 'file';
    upload.accept = 'image/jpeg,image/png,image/webp,image/gif';
    upload.addEventListener('change', async () => {
      const file = upload.files?.[0];
      if (!file) return;
      upload.disabled = true;
      try {
        toast('Subiendo imagen…');
        const data = await api('upload', {
          method: 'POST',
          body: JSON.stringify({ name: file.name, mime: file.type, base64: await fileToBase64(file) })
        });
        section.imagenes.push(data.path);
        renderImages(section, fieldset);
        toast('Imagen agregada. Pulsa “Guardar y publicar” cuando termines.', true);
      } catch (error) {
        toast(error.message);
      } finally {
        upload.disabled = false;
        upload.value = '';
      }
    });
    uploadLabel.append(upload);

    fieldset.append(titleLabel, textLabel, imagesTitle, empty, imagesList, addUrlWrap, uploadLabel);
    renderImages(section, fieldset);
    return fieldset;
  }

  function renderInfoSettings() {
    const wrap = infoQ('#infoSettings');
    if (!wrap || !state?.config) return;
    ensureInfoConfig();
    wrap.replaceChildren(...DEFINITIONS.map(makeSection));
    lastConfig = state.config;
  }

  setInterval(() => {
    const adminVisible = infoQ('#adminView') && !infoQ('#adminView').hidden;
    if (!adminVisible || !state?.config) return;
    if (lastConfig !== state.config || !infoQ('#infoSettings')?.children.length) renderInfoSettings();
  }, 250);
})();

// Keep product names/codes consistent, reconcile inventory and apply requested home-category labels.
(() => {
  const sizes = ['S', 'M', 'L', 'XL'];
  const normalizeText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const upper = value => String(value || '').toLocaleUpperCase('es-SV');
  const initialStock = {
    'BATC-01':{S:1,M:3,L:2,XL:0},
    'BATC-02':{S:0,M:2,L:1,XL:0},
    'BATC-06':{S:1,M:1,L:1,XL:0},
    'SUPC-01':{S:1,M:1,L:3,XL:0},
    'SUPC-03':{S:1,M:1,L:2,XL:1},
    'YLAC-01':{S:0,M:0,L:0,XL:0},
    'YLAC-06':{S:1,M:0,L:1,XL:0},
    'YLAC-03':{S:2,M:3,L:1,XL:1},
    'GSC-06':{S:0,M:0,L:0,XL:0},
    'GSC-04':{S:0,M:0,L:1,XL:0},
    'GSC-03':{S:2,M:2,L:3,XL:2},
    'GSC-08':{S:1,M:0,L:2,XL:0},
    'GSL1-03':{S:0,M:1,L:0,XL:0},
    'SUPH-06':{S:1,M:1,L:2,XL:0},
    'SUPH-01':{S:0,M:1,L:1,XL:0},
    'BDC1:1-09':{S:0,M:1,L:1,XL:0},
    'BDC1:1-01':{S:1,M:1,L:0,XL:0},
    'BDC-06':{S:1,M:0,L:0,XL:0},
    'BDC-03':{S:2,M:0,L:0,XL:0},
    'BDC-01':{S:1,M:0,L:0,XL:0},
    'BDH-01':{S:1,M:0,L:0,XL:0},
    'BATL-01':{S:0,M:0,L:1,XL:1},
    'BATL-02':{S:1,M:1,L:1,XL:0},
    'SUPL-01':{S:0,M:1,L:0,XL:0},
    'GSL-06':{S:0,M:1,L:0,XL:0},
    'YLAF-01':{S:2,M:3,L:2,XL:2},
    'YLAF-03':{S:1,M:1,L:1,XL:0},
    'YLAF1-01':{S:2,M:3,L:2,XL:2},
    'YLAF2-01':{S:1,M:2,L:2,XL:1},
    'YLAF1-02':{S:0,M:0,L:0,XL:0},
    'ARG':{S:0,M:0,L:0,XL:0},
    'POR':{S:0,M:0,L:0,XL:0},
    'AOTF-02':{S:1,M:0,L:0,XL:1},
    'AOTF-01':{S:1,M:0,L:0,XL:0},
    'AOTF-03':{S:1,M:0,L:0,XL:0},
    'YLAO-01':{S:0,M:0,L:1,XL:0},
    'GLD-01':{S:1,M:1,L:1,XL:1},
    'YLAP-01':{S:1,M:1,L:2,XL:1},
    'AOTP-06':{S:1,M:0,L:0,XL:0},
    'YLAP4-01':{S:0,M:1,L:2,XL:1}
  };

  const stockStyle = document.createElement('style');
  stockStyle.id = 'admin-stock-count-style';
  stockStyle.textContent = '.admin-stock-count{display:inline-flex;align-items:center;justify-content:center;min-width:30px;margin-left:4px;padding:2px 6px;border-radius:999px;background:#ececea;color:#555;font-size:10px;font-weight:800;line-height:1.3}html[data-theme=oscuro] .admin-stock-count{background:#333;color:#ddd}';
  document.head.append(stockStyle);

  function hasSavedStock(product) {
    return product?.stock && sizes.every(size => Number.isFinite(Number(product.stock[size])));
  }

  function applyInventory(product) {
    if (!product) return false;
    const code = upper(product.codigo);
    const source = hasSavedStock(product) ? product.stock : initialStock[code];
    if (!source) return false;
    let changed = !hasSavedStock(product);
    product.stock ||= {};
    product.tallas ||= {};
    sizes.forEach(size => {
      const count = Math.max(0, Math.floor(Number(source[size]) || 0));
      if (Number(product.stock[size]) !== count) { product.stock[size] = count; changed = true; }
      const available = count > 0;
      if (product.tallas[size] !== available) { product.tallas[size] = available; changed = true; }
    });
    return changed;
  }

  function polishAdminState() {
    let changed = false;
    if (Array.isArray(state?.config?.colecciones)) {
      state.config.colecciones.forEach(collection => {
        const name = normalizeText(collection?.nombre);
        let next = collection?.nombre || '';
        if (collection?.id === 'collection-4' && (name === 'accesorios' || name === 'shorts y pants')) next = 'Oversized';
        if (name === 'camisas, centros' || name === 'camisas centros') next = 'Camisas y Centros';
        if (collection && collection.nombre !== next) {
          collection.nombre = next;
          changed = true;
        }
      });
    }
    if (Array.isArray(state?.products)) {
      state.products.forEach(product => {
        if (!product) return;
        const code = upper(product.codigo);
        const name = upper(product.nombre);
        if (product.codigo !== code) { product.codigo = code; changed = true; }
        if (product.nombre !== name) { product.nombre = name; changed = true; }
        if (applyInventory(product)) changed = true;
      });
    }
    return changed;
  }

  function decorateStockCounts() {
    if (!Array.isArray(state?.filtered)) return;
    const cards = [...document.querySelectorAll('#products .product-card')];
    cards.forEach((card, index) => {
      const product = state.filtered[index];
      if (!product?.stock) return;
      card.querySelectorAll('input[data-size]').forEach(input => {
        const size = input.dataset.size;
        const label = input.closest('label');
        if (!label) return;
        let badge = label.querySelector('.admin-stock-count');
        if (!badge) {
          badge = document.createElement('small');
          badge.className = 'admin-stock-count';
          label.append(badge);
        }
        const count = Math.max(0, Number(product.stock[size]) || 0);
        badge.textContent = `${count} u.`;
        label.title = `Stock talla ${size}: ${count}`;
      });
    });
  }

  const originalNewProduct = newProduct;
  newProduct = function () {
    const product = originalNewProduct();
    product.codigo = upper(product.codigo);
    product.nombre = upper(product.nombre);
    return product;
  };

  document.addEventListener('input', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (!input.matches('#products [data-field="codigo"], #products [data-field="nombre"]')) return;
    const next = upper(input.value);
    if (next !== input.value) input.value = next;
  }, true);

  document.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches('#products input[data-size]')) return;
    const card = input.closest('.product-card');
    const cards = [...document.querySelectorAll('#products .product-card')];
    const product = state.filtered?.[cards.indexOf(card)];
    if (!product?.stock) return;
    const size = input.dataset.size;
    product.stock[size] = input.checked ? Math.max(1, Number(product.stock[size]) || 0) : 0;
    requestAnimationFrame(decorateStockCounts);
  }, true);

  let lastConfigRef = null;
  let lastProductsRef = null;
  setInterval(() => {
    if (!state?.config || !Array.isArray(state?.products)) return;
    if (state.config !== lastConfigRef || state.products !== lastProductsRef) {
      lastConfigRef = state.config;
      lastProductsRef = state.products;
      if (polishAdminState()) {
        renderCollectionSettings();
        renderProducts();
      }
    }
    decorateStockCounts();
  }, 120);
})();
