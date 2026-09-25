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

// Keep product names/codes consistent and apply the requested home-category labels.
(() => {
  const normalizeText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const upper = value => String(value || '').toLocaleUpperCase('es-SV');

  function polishAdminState() {
    let changed = false;
    if (Array.isArray(state?.config?.colecciones)) {
      state.config.colecciones.forEach(collection => {
        const name = normalizeText(collection?.nombre);
        let next = collection?.nombre || '';
        if (name === 'accesorios') next = 'Shorts y Pants';
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
      });
    }
    return changed;
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

  let lastConfigRef = null;
  let lastProductsRef = null;
  setInterval(() => {
    if (!state?.config || !Array.isArray(state?.products)) return;
    if (state.config === lastConfigRef && state.products === lastProductsRef) return;
    lastConfigRef = state.config;
    lastProductsRef = state.products;
    if (polishAdminState()) {
      renderCollectionSettings();
      renderProducts();
    }
  }, 80);
})();

// Compact the product editor: hide path fields and group the three label texts.
(() => {
  const STYLE_ID = 'haki-compact-product-editor';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .product-compact-details{margin:18px 0 0;border:1px solid #d9d9d9;border-radius:14px;overflow:hidden;background:#fff}
      .product-compact-details>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 17px;font-weight:800;user-select:none;-webkit-tap-highlight-color:transparent}
      .product-compact-details>summary::-webkit-details-marker{display:none}
      .product-compact-details>summary::after{content:'⌄';font-size:19px;line-height:1;transition:transform .18s ease}
      .product-compact-details[open]>summary::after{transform:rotate(180deg)}
      .product-compact-details .compact-details-grid{padding:0 16px 16px}
      html[data-theme=oscuro] .product-compact-details{border-color:#444;background:#242424}
      @media(max-width:700px){.product-compact-details>summary{padding:14px 15px}.product-compact-details .compact-details-grid{padding:0 14px 14px}}
    `;
    document.head.append(style);
  }

  function hideField(root, field) {
    const input = root?.querySelector?.(`[data-field="${field}"]`);
    const label = input?.closest?.('label');
    if (label) label.hidden = true;
  }

  function compactProductRoot(root) {
    if (!root?.querySelector) return;
    ['categoria', 'imagen', 'imagen2', 'imagen3', 'guiaTallas', 'imagenRespaldo'].forEach(field => hideField(root, field));
    if (root.querySelector('.product-compact-details')) return;

    const labels = ['etiquetaDisponible', 'etiquetaAgotado', 'etiquetaMasVendido']
      .map(field => root.querySelector(`[data-field="${field}"]`)?.closest('label'))
      .filter(Boolean);
    if (!labels.length) return;

    const details = document.createElement('details');
    details.className = 'product-compact-details';
    const summary = document.createElement('summary');
    summary.textContent = 'Categorías';
    const grid = document.createElement('div');
    grid.className = 'grid compact-details-grid';
    labels.forEach(label => grid.append(label));
    details.append(summary, grid);

    const extraMedia = root.querySelector('.extra-media');
    const mediaRow = root.querySelector('.media-row');
    if (extraMedia) extraMedia.after(details);
    else if (mediaRow) mediaRow.after(details);
    else root.append(details);
  }

  injectStyles();
  compactProductRoot(document.querySelector('#productTemplate')?.content);
  document.querySelectorAll('#products .product-card').forEach(compactProductRoot);

  const products = document.querySelector('#products');
  if (products) {
    new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches('.product-card')) compactProductRoot(node);
          node.querySelectorAll?.('.product-card').forEach(compactProductRoot);
        });
      }
    }).observe(products, { childList: true, subtree: true });
  }
})();
