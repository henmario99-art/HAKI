(() => {
  const input = document.querySelector('#salePlace');
  if (!input) return;

  const label = input.closest('label');
  if (!label) return;

  // Desactiva visualmente el buscador anterior. Sus listeners pueden seguir
  // existiendo, pero ya no tienen un contenedor visible donde dibujar.
  label.querySelectorAll('.destination-results,.destination-preview').forEach(node => node.remove());

  const results = document.createElement('div');
  results.className = 'destination-results';
  results.hidden = true;

  const preview = document.createElement('div');
  preview.className = 'destination-preview';
  preview.hidden = true;

  label.append(results, preview);

  let selectedDestination = null;
  let reloadPromise = null;

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const friendly = name => String(name || '')
    .replace(/\s+AGENCIA$/i, '')
    .replace(/^SAN SALVADOR METROGALERIAS$/i, 'Metrogalerías')
    .replace(/^SAN SALVADOR PLAZA JEREZ$/i, 'Plaza Jerez');

  function currentDestinations() {
    return Array.isArray(window.HAKI_DESTINATIONS) ? window.HAKI_DESTINATIONS : [];
  }

  function ensureDestinationData() {
    if (currentDestinations().length) return Promise.resolve(currentDestinations());
    if (reloadPromise) return reloadPromise;

    reloadPromise = new Promise(resolve => {
      const script = document.createElement('script');
      script.src = `sales-destinations.js?v=3&t=${Date.now()}`;
      script.onload = () => resolve(currentDestinations());
      script.onerror = () => resolve([]);
      document.head.append(script);
    });
    return reloadPromise;
  }

  function searchableText(destination) {
    return [destination?.name, ...(destination?.aliases || [])]
      .map(normalize)
      .filter(Boolean)
      .join(' ');
  }

  function matches(destination, query) {
    const tokens = normalize(query).split(' ').filter(Boolean);
    if (!tokens.length) return false;
    const haystack = searchableText(destination);
    return tokens.every(token => haystack.includes(token));
  }

  function score(destination, query) {
    const q = normalize(query);
    const name = normalize(destination?.name);
    const aliases = (destination?.aliases || []).map(normalize);
    if (name.startsWith(q)) return 0;
    if (aliases.some(alias => alias.startsWith(q))) return 1;
    if (name.includes(q)) return 2;
    if (aliases.some(alias => alias.includes(q))) return 3;
    return 4;
  }

  function renderPreview(destination) {
    selectedDestination = destination || null;
    preview.replaceChildren();
    if (!destination) {
      preview.hidden = true;
      return;
    }

    preview.hidden = false;
    const img = document.createElement('img');
    img.src = destination.image || '';
    img.alt = '';
    img.addEventListener('error', () => { img.style.display = 'none'; });

    const copy = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = friendly(destination.name);
    const small = document.createElement('span');
    small.textContent = 'Agencia seleccionada';
    copy.append(strong, small);

    const link = document.createElement('a');
    link.href = destination.url || '#';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Ver imagen';

    preview.append(img, copy, link);
  }

  function renderOption(destination) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'destination-option';

    const img = document.createElement('img');
    img.src = destination.image || '';
    img.alt = '';
    img.addEventListener('error', () => { img.style.visibility = 'hidden'; });

    const copy = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = friendly(destination.name);
    const small = document.createElement('small');
    small.textContent = destination.name || '';
    copy.append(strong, small);

    button.append(img, copy);
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.addEventListener('click', () => {
      input.value = friendly(destination.name);
      renderPreview(destination);
      results.hidden = true;
    });
    return button;
  }

  async function renderSuggestions() {
    const query = normalize(input.value);
    results.replaceChildren();

    // Con dos letras ya responde; con cuatro o más siempre debe encontrar
    // cualquier coincidencia parcial del nombre o alias de la agencia.
    if (query.length < 2) {
      results.hidden = true;
      return;
    }

    const destinations = await ensureDestinationData();
    const matchesList = destinations
      .filter(destination => matches(destination, query))
      .sort((a, b) => score(a, query) - score(b, query) || String(a.name).localeCompare(String(b.name)))
      .slice(0, 12);

    if (!matchesList.length) {
      const empty = document.createElement('div');
      empty.className = 'destination-search-empty';
      empty.textContent = 'No encontramos una agencia con ese nombre.';
      results.append(empty);
      results.hidden = false;
      return;
    }

    matchesList.forEach(destination => results.append(renderOption(destination)));
    results.hidden = false;
  }

  function typedStillMatchesSelection() {
    if (!selectedDestination) return false;
    const typed = normalize(input.value);
    if (!typed) return false;
    return normalize(friendly(selectedDestination.name)) === typed || matches(selectedDestination, typed);
  }

  input.addEventListener('focus', renderSuggestions);
  input.addEventListener('input', () => {
    if (selectedDestination && !typedStillMatchesSelection()) renderPreview(null);
    renderSuggestions();
  });
  input.addEventListener('keyup', renderSuggestions);
  input.addEventListener('search', renderSuggestions);
  input.addEventListener('blur', () => setTimeout(() => { results.hidden = true; }, 180));

  // Conserva la agencia elegida dentro de la venta aunque el buscador original
  // no haya podido cargar su copia de los destinos.
  if (typeof formSale === 'function') {
    const previousFormSale = formSale;
    formSale = function () {
      const sale = previousFormSale();
      if (selectedDestination) {
        sale.destinoDriveId = selectedDestination.id || '';
        sale.destinoImagen = selectedDestination.image || '';
      }
      return sale;
    };
  }

  if (typeof resetForm === 'function') {
    const previousResetForm = resetForm;
    resetForm = function () {
      selectedDestination = null;
      previousResetForm();
      renderPreview(null);
      results.hidden = true;
    };
  }

  if (typeof openEditSale === 'function') {
    const previousOpenEditSale = openEditSale;
    openEditSale = function (sale) {
      previousOpenEditSale(sale);
      const list = currentDestinations();
      selectedDestination = list.find(item => item.id === sale?.destinoDriveId) || null;
      if (!selectedDestination && sale?.lugarHorario) {
        selectedDestination = list.find(item => matches(item, sale.lugarHorario)) || null;
      }
      renderPreview(selectedDestination);
    };
  }
})();
