(() => {
  const TYPO_DEFAULTS = {
    anuncio: { fuente: 'Poppins', negrita: true },
    tituloPortada: { fuente: 'Horizon', negrita: true },
    textoPortada: { fuente: 'Poppins', negrita: false },
    botonesPortada: { fuente: 'Poppins', negrita: true },
    titulosSeccion: { fuente: 'Horizon', negrita: true },
    categorias: { fuente: 'Poppins', negrita: true },
    nombreProducto: { fuente: 'Poppins', negrita: true },
    codigoProducto: { fuente: 'Poppins', negrita: false },
    precioProducto: { fuente: 'Poppins', negrita: true },
    botonesCatalogo: { fuente: 'Poppins', negrita: true },
    tituloCarrito: { fuente: 'Horizon', negrita: true },
    textoCarrito: { fuente: 'Poppins', negrita: false },
    botonesCarrito: { fuente: 'Poppins', negrita: true },
    footer: { fuente: 'Poppins', negrita: false },
    gymratTitulo: { fuente: 'Horizon', negrita: true },
    gymratTexto: { fuente: 'Poppins', negrita: false }
  };

  const TYPO_LABELS = {
    anuncio: 'Anuncios superiores', tituloPortada: 'Título de portada', textoPortada: 'Texto de portada', botonesPortada: 'Botones de portada', titulosSeccion: 'Títulos de secciones', categorias: 'Categorías y menús', nombreProducto: 'Nombres de productos', codigoProducto: 'Códigos de productos', precioProducto: 'Precios', botonesCatalogo: 'Botones y tallas del catálogo', tituloCarrito: 'Títulos del carrito', textoCarrito: 'Textos del carrito', botonesCarrito: 'Botones del carrito', footer: 'Pie de página', gymratTitulo: 'Títulos de GYMRAT TEST', gymratTexto: 'Textos de GYMRAT TEST'
  };

  const GYMRAT_DEFAULTS = {
    habilitado: true, botonTexto: 'GYMRAT TEST', titulo: 'GYMRAT TEST', introduccion: 'Responde estas preguntas y descubre qué tipo de gymrat eres. Al final te mostraremos una selección de prendas HAKI pensada para ti.',
    preguntas: [
      { id: 'color', texto: '¿Color favorito?', opciones: ['Blanco', 'Negro', 'Rojo', 'Azul', 'Gris'] },
      { id: 'ejercicio', texto: '¿Ejercicio favorito?', opciones: ['Sentadilla', 'Peso Muerto', 'Press banca', 'Curl bíceps'] },
      { id: 'frecuencia', texto: 'Entreno...', opciones: ['2-3 días a la semana', '7 días a la semana', 'Cuando puedo'] },
      { id: 'fit', texto: 'Prefieres...', opciones: ['Compresión', 'Holgado'] }
    ],
    perfiles: {
      dark: { nombre: 'GYMRAT DARK MODE', texto: 'Eres un GYMRAT DARK MODE, seguro de ti mismo. No necesitas ser extrovertido para hacerte notar; seguramente entrenas con Rosa Pastel de fondo. Te preparamos una selección de prendas que sabemos que te van a gustar.', reglas: { color: ['Negro', 'Rojo', 'Gris'], ejercicio: ['Peso Muerto', 'Sentadilla'], frecuencia: ['7 días a la semana'], fit: ['Compresión'] }, coloresProducto: ['Negro'], tiposProducto: ['compresión','compresion','compression'] },
      angel: { nombre: 'GYMRAT ANGELICAL', texto: 'Eres un GYMRAT Angelical. Te gusta lucir pulcro, elegante y llevar todo súper ordenado. Evitas la fatiga y seguramente escuchas podcast para entrenar. Te preparamos una selección de prendas que sabemos que te van a gustar.', reglas: { color: ['Blanco', 'Azul'], ejercicio: ['Curl bíceps', 'Press banca'], frecuencia: ['2-3 días a la semana', 'Cuando puedo'], fit: ['Compresión', 'Holgado'] }, coloresProducto: ['Blanco','Azul'], tiposProducto: ['compresión','compresion','compression','oversized','pants','jogger'] },
      heavy: { nombre: 'GYMRAT HEAVY DUTY', texto: 'Eres un GYMRAT Heavy Duty. Entrenas siempre pesado y al fallo; definitivamente no te importa nada. ¿Fatiga? Para ti no existe. Escuchas de todo para entrenar, desde rock hasta pop girly. Te preparamos una selección de prendas que sabemos que te va a gustar.', reglas: { color: ['Rojo'], ejercicio: ['Peso Muerto', 'Sentadilla'], frecuencia: ['7 días a la semana'], fit: ['Compresión'] }, coloresProducto: ['Rojo'], tiposProducto: ['oversized','compresión','compresion','compression'] }
    },
    maxProductos: 8
  };

  let lastConfig = null;
  const lines = value => Array.isArray(value) ? value.join('\n') : '';
  const toArray = value => String(value || '').split(/\n|,/).map(item => item.trim()).filter(Boolean);
  const clone = value => JSON.parse(JSON.stringify(value));

  function ensureConfig() {
    state.config.tipografia ||= {};
    Object.entries(TYPO_DEFAULTS).forEach(([key, value]) => { state.config.tipografia[key] = { ...value, ...(state.config.tipografia[key] || {}) }; });
    if (!state.config.gymrat || typeof state.config.gymrat !== 'object') state.config.gymrat = clone(GYMRAT_DEFAULTS);
    const gymrat = state.config.gymrat;
    gymrat.habilitado = gymrat.habilitado !== false && gymrat.habilitado !== 'false';
    gymrat.botonTexto ||= GYMRAT_DEFAULTS.botonTexto; gymrat.titulo ||= GYMRAT_DEFAULTS.titulo; gymrat.introduccion ||= GYMRAT_DEFAULTS.introduccion; gymrat.maxProductos = Number(gymrat.maxProductos) || GYMRAT_DEFAULTS.maxProductos;
    if (!Array.isArray(gymrat.preguntas) || gymrat.preguntas.length < 4) gymrat.preguntas = clone(GYMRAT_DEFAULTS.preguntas);
    gymrat.perfiles ||= {};
    Object.entries(GYMRAT_DEFAULTS.perfiles).forEach(([key, defaults]) => {
      gymrat.perfiles[key] = { ...clone(defaults), ...(gymrat.perfiles[key] || {}) };
      gymrat.perfiles[key].reglas = { ...clone(defaults.reglas), ...(gymrat.perfiles[key].reglas || {}) };
      ['color','ejercicio','frecuencia','fit'].forEach(rule => { if (!Array.isArray(gymrat.perfiles[key].reglas[rule])) gymrat.perfiles[key].reglas[rule] = clone(defaults.reglas[rule]); });
      if (!Array.isArray(gymrat.perfiles[key].coloresProducto)) gymrat.perfiles[key].coloresProducto = clone(defaults.coloresProducto);
      if (!Array.isArray(gymrat.perfiles[key].tiposProducto)) gymrat.perfiles[key].tiposProducto = clone(defaults.tiposProducto);
    });
  }

  function makeTypographyCard() {
    const card = document.createElement('section'); card.className = 'config-card'; card.id = 'typographySettings'; card.innerHTML = '<h2>Tipografía por tipo de texto</h2><p>Elige Poppins o Horizon para cada grupo y activa o desactiva la negrita. Los anuncios superiores se muestran subrayados en el catálogo.</p>';
    const wrap = document.createElement('div'); wrap.className = 'type-settings';
    Object.keys(TYPO_DEFAULTS).forEach(key => {
      const setting = state.config.tipografia[key], row = document.createElement('div'); row.className = 'type-setting-row';
      const name = document.createElement('strong'); name.textContent = TYPO_LABELS[key];
      const select = document.createElement('select'); ['Poppins','Horizon'].forEach(font => { const option = document.createElement('option'); option.value = font; option.textContent = font; select.append(option); }); select.value = setting.fuente || TYPO_DEFAULTS[key].fuente; select.addEventListener('change', () => { setting.fuente = select.value; });
      const boldLabel = document.createElement('label'); boldLabel.className = 'check-label type-bold'; const bold = document.createElement('input'); bold.type = 'checkbox'; bold.checked = setting.negrita !== false && setting.negrita !== 'false'; bold.addEventListener('change', () => { setting.negrita = bold.checked; }); boldLabel.append(bold, document.createTextNode(' Negrita'));
      row.append(name, select, boldLabel); wrap.append(row);
    }); card.append(wrap); return card;
  }

  function makeTextField(labelText, value, onInput, textarea = false) { const label = document.createElement('label'); label.textContent = labelText; const input = document.createElement(textarea ? 'textarea' : 'input'); if (textarea) input.rows = 4; input.value = value ?? ''; input.addEventListener('input', () => onInput(input.value)); label.append(input); return label; }
  function makeQuestion(question, index) { const fieldset = document.createElement('fieldset'); const legend = document.createElement('legend'); legend.textContent = `Pregunta ${index + 1}`; fieldset.append(legend, makeTextField('Pregunta', question.texto, value => { question.texto = value; }), makeTextField('Opciones — una por línea', lines(question.opciones), value => { question.opciones = toArray(value); }, true)); return fieldset; }
  function makeProfile(key, labelText) {
    const profile = state.config.gymrat.perfiles[key], fieldset = document.createElement('fieldset'), legend = document.createElement('legend'); legend.textContent = labelText; fieldset.append(legend, makeTextField('Nombre del resultado', profile.nombre, value => { profile.nombre = value; }), makeTextField('Descripción del resultado', profile.texto, value => { profile.texto = value; }, true));
    const rulesTitle = document.createElement('strong'); rulesTitle.textContent = 'Respuestas que suman puntos a este perfil'; fieldset.append(rulesTitle); const ruleGrid = document.createElement('div'); ruleGrid.className = 'grid config-grid'; const labels = {color:'Color',ejercicio:'Ejercicio',frecuencia:'Frecuencia',fit:'Preferencia'}; Object.keys(labels).forEach(rule => ruleGrid.append(makeTextField(`${labels[rule]} — separa con comas`, (profile.reglas[rule] || []).join(', '), value => { profile.reglas[rule] = toArray(value); }))); fieldset.append(ruleGrid);
    const productTitle = document.createElement('strong'); productTitle.textContent = 'Prendas recomendadas para este resultado'; fieldset.append(productTitle); const productGrid = document.createElement('div'); productGrid.className = 'grid config-grid'; productGrid.append(makeTextField('Palabras de color — separa con comas', (profile.coloresProducto || []).join(', '), value => { profile.coloresProducto = toArray(value); }), makeTextField('Tipos de prenda — separa con comas', (profile.tiposProducto || []).join(', '), value => { profile.tiposProducto = toArray(value); })); fieldset.append(productGrid); return fieldset;
  }

  function makeGymratCard() {
    const gymrat = state.config.gymrat, card = document.createElement('section'); card.className = 'config-card'; card.id = 'gymratSettings'; card.innerHTML = '<h2>GYMRAT TEST</h2><p>Edita el cuestionario, sus respuestas, los tres resultados y las reglas que se usan para recomendar prendas.</p>';
    const enabled = document.createElement('label'); enabled.className = 'check-label gymrat-enabled'; const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = gymrat.habilitado !== false; checkbox.addEventListener('change', () => { gymrat.habilitado = checkbox.checked; }); enabled.append(checkbox, document.createTextNode(' Mostrar GYMRAT TEST en el botón derecho de la portada')); card.append(enabled);
    const basics = document.createElement('div'); basics.className = 'grid config-grid'; basics.append(makeTextField('Texto del botón', gymrat.botonTexto, value => { gymrat.botonTexto = value; }), makeTextField('Título del cuestionario', gymrat.titulo, value => { gymrat.titulo = value; }), makeTextField('Introducción', gymrat.introduccion, value => { gymrat.introduccion = value; }, true)); const maxLabel = document.createElement('label'); maxLabel.textContent = 'Máximo de prendas recomendadas'; const max = document.createElement('input'); max.type='number'; max.min='1'; max.max='16'; max.value=gymrat.maxProductos; max.addEventListener('input',()=>{gymrat.maxProductos=Math.max(1,Math.min(16,Number(max.value)||8));}); maxLabel.append(max); basics.append(maxLabel); card.append(basics);
    const questions = document.createElement('details'); questions.open = true; const qSummary = document.createElement('summary'); qSummary.textContent='Preguntas y opciones'; questions.append(qSummary); const qWrap=document.createElement('div'); qWrap.className='personalization-stack'; gymrat.preguntas.slice(0,4).forEach((q,i)=>qWrap.append(makeQuestion(q,i))); questions.append(qWrap); card.append(questions);
    const profiles=document.createElement('details'); const pSummary=document.createElement('summary'); pSummary.textContent='Resultados y reglas'; profiles.append(pSummary); const pWrap=document.createElement('div'); pWrap.className='personalization-stack'; pWrap.append(makeProfile('dark','GYMRAT DARK MODE'),makeProfile('angel','GYMRAT ANGELICAL'),makeProfile('heavy','GYMRAT HEAVY DUTY')); profiles.append(pWrap); card.append(profiles); return card;
  }

  function addStyles() { if (document.getElementById('personalization-admin-style')) return; const style=document.createElement('style'); style.id='personalization-admin-style'; style.textContent='.type-settings{display:grid;gap:8px}.type-setting-row{display:grid;grid-template-columns:minmax(190px,1fr) minmax(130px,180px) auto;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #e6e6e6}.type-setting-row strong{font-size:13px}.type-setting-row select{min-height:40px}.type-bold{white-space:nowrap}.personalization-stack{display:grid;gap:16px;padding-top:14px}.personalization-stack fieldset{margin:0}.gymrat-enabled{margin:12px 0 18px}.config-card>details{margin-top:16px}.config-card>details>summary{cursor:pointer;font-weight:750;padding:12px 0;border-top:1px solid #e5e5e5}.personalization-stack textarea{width:100%;resize:vertical}@media(max-width:720px){.type-setting-row{grid-template-columns:1fr 1fr}.type-setting-row strong{grid-column:1/-1}}'; document.head.append(style); }
  function render() { const admin=document.getElementById('adminView'); if(!admin||admin.hidden||!state?.config)return; ensureConfig(); addStyles(); document.getElementById('typographySettings')?.remove(); document.getElementById('gymratSettings')?.remove(); const anchor=document.getElementById('experienceSettings')||admin.querySelector('.config-card'); anchor.after(makeTypographyCard(),makeGymratCard()); lastConfig=state.config; }
  setInterval(()=>{ const visible=document.getElementById('adminView')&&!document.getElementById('adminView').hidden; if(!visible||!state?.config)return; if(lastConfig!==state.config||!document.getElementById('gymratSettings')||!document.getElementById('typographySettings'))render(); },250);
})();
