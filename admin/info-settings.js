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
