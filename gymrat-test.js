(() => {
  const DEFAULT_GYMRAT = {
    habilitado: true,
    botonTexto: 'GYMRAT TEST',
    titulo: 'GYMRAT TEST',
    introduccion: 'Responde estas preguntas y descubre qué tipo de gymrat eres. Al final te mostraremos una selección de prendas HAKI pensada para ti.',
    preguntas: [
      { id: 'color', texto: '¿Color favorito?', opciones: ['Blanco', 'Negro', 'Rojo', 'Azul', 'Gris'] },
      { id: 'ejercicio', texto: '¿Ejercicio favorito?', opciones: ['Sentadilla', 'Peso Muerto', 'Press banca', 'Curl bíceps'] },
      { id: 'frecuencia', texto: 'Entreno...', opciones: ['2-3 días a la semana', '7 días a la semana', 'Cuando puedo'] },
      { id: 'fit', texto: 'Prefieres...', opciones: ['Compresión', 'Holgado'] }
    ],
    perfiles: {
      dark: {
        nombre: 'GYMRAT DARK MODE',
        texto: 'Eres un GYMRAT DARK MODE, seguro de ti mismo. No necesitas ser extrovertido para hacerte notar; seguramente entrenas con Rosa Pastel de fondo. Te preparamos una selección de prendas que sabemos que te van a gustar.',
        reglas: {
          color: ['Negro', 'Rojo', 'Gris'],
          ejercicio: ['Peso Muerto', 'Sentadilla'],
          frecuencia: ['7 días a la semana'],
          fit: ['Compresión']
        },
        coloresProducto: ['negro', 'negra', 'black', 'gris', 'gray'],
        tiposProducto: ['compresión', 'compresion', 'compression']
      },
      angel: {
        nombre: 'GYMRAT ANGELICAL',
        texto: 'Eres un GYMRAT Angelical. Te gusta lucir pulcro, elegante y llevar todo súper ordenado. Evitas la fatiga y seguramente escuchas podcast para entrenar. Te preparamos una selección de prendas que sabemos que te van a gustar.',
        reglas: {
          color: ['Blanco', 'Azul'],
          ejercicio: ['Curl bíceps', 'Press banca'],
          frecuencia: ['2-3 días a la semana', 'Cuando puedo'],
          fit: ['Compresión', 'Holgado']
        },
        coloresProducto: ['blanco', 'blanca', 'white', 'azul', 'blue'],
        tiposProducto: ['compresión', 'compresion', 'compression', 'oversized', 'pants', 'jogger']
      },
      heavy: {
        nombre: 'GYMRAT HEAVY DUTY',
        texto: 'Eres un GYMRAT Heavy Duty. Entrenas siempre pesado y al fallo; definitivamente no te importa nada. ¿Fatiga? Para ti no existe. Escuchas de todo para entrenar, desde rock hasta pop girly. Te preparamos una selección de prendas que sabemos que te va a gustar.',
        reglas: {
          color: ['Rojo'],
          ejercicio: ['Peso Muerto', 'Sentadilla'],
          frecuencia: ['7 días a la semana'],
          fit: ['Compresión']
        },
        coloresProducto: ['rojo', 'roja', 'red'],
        tiposProducto: ['oversized', 'compresión', 'compresion', 'compression']
      }
    },
    maxProductos: 8
  };

  window.HAKI_GYMRAT_DEFAULTS = DEFAULT_GYMRAT;
  window.hakiGymratSettings = config => {
    const raw = config?.gymrat || {};
    const result = {
      ...DEFAULT_GYMRAT,
      ...raw,
      preguntas: Array.isArray(raw.preguntas) && raw.preguntas.length ? raw.preguntas : DEFAULT_GYMRAT.preguntas,
      perfiles: { ...DEFAULT_GYMRAT.perfiles }
    };
    Object.keys(DEFAULT_GYMRAT.perfiles).forEach(key => {
      result.perfiles[key] = {
        ...DEFAULT_GYMRAT.perfiles[key],
        ...(raw.perfiles?.[key] || {}),
        reglas: {
          ...DEFAULT_GYMRAT.perfiles[key].reglas,
          ...(raw.perfiles?.[key]?.reglas || {})
        }
      };
    });
    return result;
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const money = value => `${window.HAKI_CONFIG?.moneda || '$'}${Number(value || 0).toFixed(2)}`;

  function config() {
    return window.hakiGymratSettings(window.HAKI_CONFIG || {});
  }

  function ensureDialog() {
    let dialog = document.getElementById('gymratDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'gymratDialog';
    dialog.className = 'gymrat-dialog';
    document.body.appendChild(dialog);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('cancel', () => resetQuiz(dialog));
    return dialog;
  }

  function optionMarkup(question, option, index) {
    const id = `gymrat-${question.id}-${index}`;
    return `<label class="gymrat-option" for="${esc(id)}">
      <input id="${esc(id)}" type="radio" name="${esc(question.id)}" value="${esc(option)}" required>
      <span class="gymrat-radio" aria-hidden="true"></span>
      <span class="gymrat-option-text">${esc(option)}</span>
    </label>`;
  }

  function quizMarkup(settings) {
    return `<div class="gymrat-shell">
      <div class="gymrat-head">
        <div><p class="gymrat-kicker">HAKI · PERSONALIDAD DE ENTRENAMIENTO</p><h2>${esc(settings.titulo)}</h2></div>
        <button class="gymrat-close" type="button" aria-label="Cerrar">×</button>
      </div>
      <div class="gymrat-quiz-view">
        <p class="gymrat-intro">${esc(settings.introduccion)}</p>
        <form class="gymrat-form">
          ${settings.preguntas.map((question, qIndex) => `
            <fieldset class="gymrat-question" data-question="${esc(question.id)}">
              <legend>${qIndex + 1}. ${esc(question.texto)}</legend>
              <div class="gymrat-options">
                ${(question.opciones || []).map((option, index) => optionMarkup(question, option, index)).join('')}
              </div>
            </fieldset>`).join('')}
          <p class="gymrat-form-status" role="status"></p>
          <button class="gymrat-submit" type="submit">VER MI RESULTADO</button>
        </form>
      </div>
      <section class="gymrat-result" aria-live="polite"></section>
    </div>`;
  }

  function scoresFor(answers, settings) {
    const scores = {};
    const priorities = { heavy: 3, dark: 2, angel: 1 };
    Object.entries(settings.perfiles).forEach(([key, profile]) => {
      let score = 0;
      Object.entries(profile.reglas || {}).forEach(([questionId, allowed]) => {
        const answer = normalize(answers[questionId]);
        if ((allowed || []).some(value => normalize(value) === answer)) score += 1;
      });
      scores[key] = { score, priority: priorities[key] || 0 };
    });
    return Object.entries(scores)
      .sort((a, b) => b[1].score - a[1].score || b[1].priority - a[1].priority)[0]?.[0] || 'dark';
  }

  function productScore(product, profile, profileKey) {
    const haystack = normalize(`${product.nombre || ''} ${product.categoria || ''} ${(product.colecciones || []).join(' ')}`);
    let score = 0;
    (profile.coloresProducto || []).forEach(keyword => {
      if (haystack.includes(normalize(keyword))) score += 4;
    });
    (profile.tiposProducto || []).forEach(keyword => {
      if (haystack.includes(normalize(keyword))) score += 2;
    });
    if (profileKey === 'angel' && /(pants|pant|jogger|pantalon)/.test(haystack)) score += 4;
    if (product.novedad === true) score += .25;
    return score;
  }

  function recommendations(profile, profileKey, settings) {
    const products = (window.HAKI_PRODUCTOS || []).filter(p => p && p.codigo && p.nombre);
    const available = products.filter(p => ['S','M','L','XL'].some(size => !!p.tallas?.[size]));
    const ranked = available
      .map((product, index) => ({ product, score: productScore(product, profile, profileKey), index }))
      .sort((a, b) => b.score - a.score || a.index - b.index);
    const preferred = ranked.filter(item => item.score > 0);
    const rest = ranked.filter(item => item.score <= 0);
    return [...preferred, ...rest].slice(0, Math.max(1, Number(settings.maxProductos) || 8)).map(item => item.product);
  }

  function productCard(product) {
    const image = typeof window.hakiImage === 'function'
      ? window.hakiImage(product.imagen || product.imagenRespaldo, 600)
      : (product.imagen || product.imagenRespaldo || 'images/producto.svg');
    return `<a class="gymrat-product" href="#producto/${encodeURIComponent(product.codigo)}">
      <div class="gymrat-product-image"><img src="${esc(image)}" alt="${esc(product.nombre)}" loading="lazy"></div>
      <div class="gymrat-product-meta">
        <div><span class="gymrat-product-code">${esc(product.codigo)}</span><span class="gymrat-product-name">${esc(product.nombre)}</span></div>
        <span class="gymrat-product-price">${esc(money(product.precio))}</span>
      </div>
    </a>`;
  }

  function showResult(dialog, answers, settings) {
    const key = scoresFor(answers, settings);
    const profile = settings.perfiles[key] || settings.perfiles.dark;
    const products = recommendations(profile, key, settings);
    const quizView = dialog.querySelector('.gymrat-quiz-view');
    const result = dialog.querySelector('.gymrat-result');
    if (quizView) quizView.hidden = true;
    result.innerHTML = `
      <span class="gymrat-result-badge">TU RESULTADO</span>
      <h2 class="gymrat-result-title">${esc(profile.nombre)}</h2>
      <p class="gymrat-result-copy">${esc(profile.texto)}</p>
      <div class="gymrat-recs-head"><div><h3>SELECCIÓN PARA TI</h3><p>Prendas elegidas según tus respuestas.</p></div></div>
      <div class="gymrat-products">${products.map(productCard).join('')}</div>
      <div class="gymrat-result-actions">
        <button class="gymrat-restart" type="button">REPETIR TEST</button>
        <a class="gymrat-shop" href="#catalogo">VER TODAS LAS PRENDAS</a>
      </div>`;
    result.classList.add('active');
    result.querySelector('.gymrat-restart')?.addEventListener('click', () => resetQuiz(dialog));
    result.querySelectorAll('a').forEach(link => link.addEventListener('click', () => dialog.close()));
    dialog.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetQuiz(dialog) {
    const settings = config();
    dialog.innerHTML = quizMarkup(settings);
    dialog.querySelector('.gymrat-close')?.addEventListener('click', () => dialog.close());
    const form = dialog.querySelector('.gymrat-form');
    form?.addEventListener('submit', event => {
      event.preventDefault();
      const answers = {};
      let complete = true;
      settings.preguntas.forEach(question => {
        const checked = form.querySelector(`input[name="${CSS.escape(question.id)}"]:checked`);
        if (!checked) complete = false;
        else answers[question.id] = checked.value;
      });
      const status = form.querySelector('.gymrat-form-status');
      if (!complete) {
        status.textContent = 'Selecciona una respuesta en cada pregunta.';
        const firstMissing = settings.preguntas.find(question => !answers[question.id]);
        form.querySelector(`[data-question="${CSS.escape(firstMissing?.id || '')}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      status.textContent = '';
      showResult(dialog, answers, settings);
    });
  }

  function openQuiz(event) {
    event?.preventDefault();
    const settings = config();
    if (settings.habilitado === false || settings.habilitado === 'false') return;
    const dialog = ensureDialog();
    resetQuiz(dialog);
    dialog.showModal();
  }

  function setupButton() {
    const settings = config();
    const button = document.getElementById('heroButton2');
    if (!button) return;
    button.textContent = settings.botonTexto || 'GYMRAT TEST';
    button.href = '#gymrat-test';
    button.hidden = settings.habilitado === false || settings.habilitado === 'false';
    if (button.dataset.gymratReady !== '1') {
      button.dataset.gymratReady = '1';
      button.addEventListener('click', openQuiz);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupButton, { once: true });
  else setupButton();

  window.addEventListener('haki:catalog-updated', setupButton);
})();
