(() => {
  const DEFAULT_GYMRAT = {
    habilitado:true,
    botonTexto:'GYMRAT TEST',
    titulo:'GYMRAT TEST',
    introduccion:'Responde estas preguntas y descubre qué tipo de gymrat eres. Al final te mostraremos una selección de prendas HAKI pensada para ti.',
    preguntas:[
      {id:'color',texto:'¿Color favorito?',opciones:['Blanco','Negro','Rojo','Azul','Gris']},
      {id:'ejercicio',texto:'¿Ejercicio favorito?',opciones:['Sentadilla','Peso Muerto','Press banca','Curl bíceps']},
      {id:'frecuencia',texto:'Entreno...',opciones:['2-3 días a la semana','7 días a la semana','Cuando puedo']},
      {id:'fit',texto:'Prefieres...',opciones:['Compresión','Holgado']}
    ],
    perfiles:{
      dark:{
        nombre:'GYMRAT DARK MODE',
        texto:'Eres un GYMRAT DARK MODE, seguro de ti mismo. No necesitas ser extrovertido para hacerte notar; seguramente entrenas con Rosa Pastel de fondo. Te preparamos una selección de prendas que sabemos que te van a gustar.',
        reglas:{color:['Negro','Rojo','Gris'],ejercicio:['Peso Muerto','Sentadilla'],frecuencia:['7 días a la semana'],fit:['Compresión']},
        coloresProducto:['Negro'],
        tiposProducto:['compresión','compresion','compression']
      },
      angel:{
        nombre:'GYMRAT ANGELICAL',
        texto:'Eres un GYMRAT Angelical. Te gusta lucir pulcro, elegante y llevar todo súper ordenado. Evitas la fatiga y seguramente escuchas podcast para entrenar. Te preparamos una selección de prendas que sabemos que te van a gustar.',
        reglas:{color:['Blanco','Azul'],ejercicio:['Curl bíceps','Press banca'],frecuencia:['2-3 días a la semana','Cuando puedo'],fit:['Compresión','Holgado']},
        coloresProducto:['Blanco','Azul'],
        tiposProducto:['compresión','compresion','compression','oversized','pants','jogger']
      },
      heavy:{
        nombre:'GYMRAT HEAVY DUTY',
        texto:'Eres un GYMRAT Heavy Duty. Entrenas siempre pesado y al fallo; definitivamente no te importa nada. ¿Fatiga? Para ti no existe. Escuchas de todo para entrenar, desde rock hasta pop girly. Te preparamos una selección de prendas que sabemos que te va a gustar.',
        reglas:{color:['Rojo'],ejercicio:['Peso Muerto','Sentadilla'],frecuencia:['7 días a la semana'],fit:['Compresión']},
        coloresProducto:['Rojo'],
        tiposProducto:['oversized','compresión','compresion','compression']
      }
    },
    maxProductos:8
  };

  window.HAKI_GYMRAT_DEFAULTS = DEFAULT_GYMRAT;
  window.hakiGymratSettings = config => {
    const raw=config?.gymrat||{};
    const merged={...DEFAULT_GYMRAT,...raw};
    merged.preguntas=Array.isArray(raw.preguntas)&&raw.preguntas.length?raw.preguntas:DEFAULT_GYMRAT.preguntas;
    merged.perfiles={...DEFAULT_GYMRAT.perfiles};
    Object.keys(DEFAULT_GYMRAT.perfiles).forEach(key=>{
      merged.perfiles[key]={...DEFAULT_GYMRAT.perfiles[key],...(raw.perfiles?.[key]||{})};
      merged.perfiles[key].reglas={...DEFAULT_GYMRAT.perfiles[key].reglas,...(raw.perfiles?.[key]?.reglas||{})};
    });
    return merged;
  };

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const money=value=>`${window.HAKI_CONFIG?.moneda||'$'}${Number(value||0).toFixed(2)}`;
  const reduceMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const colorAliases={
    blanco:['blanco','blanca','white'],negro:['negro','negra','black'],rojo:['rojo','roja','red'],
    azul:['azul','blue'],gris:['gris','gray','grey'],rosa:['rosa','rosado','rosada','pink']
  };
  const canonicalColor=value=>{
    const n=normalize(value);
    return Object.entries(colorAliases).find(([,aliases])=>aliases.some(alias=>n.includes(alias)))?.[0]||n;
  };

  function settings(){return window.hakiGymratSettings(window.HAKI_CONFIG||{});}

  function ensureDialog(){
    let dialog=document.getElementById('gymratDialog');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='gymratDialog';dialog.className='gymrat-dialog';document.body.appendChild(dialog);
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    return dialog;
  }

  function scoresFor(answers,cfg){
    const priorities={heavy:3,dark:2,angel:1};
    return Object.entries(cfg.perfiles||{}).map(([key,profile])=>{
      let score=0;
      Object.entries(profile.reglas||{}).forEach(([qid,allowed])=>{
        const answer=normalize(answers[qid]);
        if((allowed||[]).some(v=>normalize(v)===answer))score++;
      });
      return {key,score,priority:priorities[key]||0};
    }).sort((a,b)=>b.score-a.score||b.priority-a.priority)[0]?.key||'dark';
  }

  function explicitProductColors(product){
    const raw=Array.isArray(product.colores)?product.colores:(product.color?[product.color]:[]);
    return raw.map(canonicalColor).filter(Boolean);
  }

  function allowedProfileColors(profile){
    return [...new Set((profile.coloresProducto||[]).map(canonicalColor).filter(Boolean))];
  }

  function productTypeScore(product,profile,profileKey){
    const haystack=normalize(`${product.nombre||''} ${product.categoria||''} ${(product.colecciones||[]).join(' ')}`);
    let score=0;
    (profile.tiposProducto||[]).forEach(keyword=>{if(haystack.includes(normalize(keyword)))score+=3;});
    if(profileKey==='angel'&&/(pants|pant|jogger|pantalon)/.test(haystack))score+=3;
    if(product.novedad===true)score+=.25;
    return score;
  }

  function recommendations(profile,profileKey,cfg,answers={}){
    const selectedColor=canonicalColor(answers.color||'');
    const fallbackColors=allowedProfileColors(profile);
    const allowedColors=selectedColor?[selectedColor]:fallbackColors;
    const products=(window.HAKI_PRODUCTOS||[]).filter(p=>p&&p.codigo&&p.nombre);
    return products
      .filter(p=>['S','M','L','XL'].some(size=>!!p.tallas?.[size]))
      .filter(p=>{
        const colors=explicitProductColors(p);
        return colors.length>0&&colors.some(color=>allowedColors.includes(color));
      })
      .map((product,index)=>({product,index,score:productTypeScore(product,profile,profileKey)}))
      .sort((a,b)=>b.score-a.score||a.index-b.index)
      .slice(0,Math.max(1,Number(cfg.maxProductos)||8))
      .map(item=>item.product);
  }

  function productCard(product){
    const image=typeof window.hakiImage==='function'?window.hakiImage(product.imagen||product.imagenRespaldo,600):(product.imagen||product.imagenRespaldo||'images/producto.svg');
    return `<a class="gymrat-product" href="#producto/${encodeURIComponent(product.codigo)}"><div class="gymrat-product-image"><img src="${esc(image)}" alt="${esc(product.nombre)}" loading="lazy"></div><div class="gymrat-product-meta"><div><span class="gymrat-product-code">${esc(product.codigo)}</span><span class="gymrat-product-name">${esc(product.nombre)}</span></div><span class="gymrat-product-price">${esc(money(product.precio))}</span></div></a>`;
  }

  function shellMarkup(cfg){
    return `<div class="gymrat-shell"><div class="gymrat-head"><h2 class="gymrat-head-title">${esc(cfg.titulo)}</h2><button class="gymrat-close" type="button" aria-label="Cerrar">×</button></div><div class="gymrat-progress"><div class="gymrat-progress-track"><div class="gymrat-progress-fill"></div></div></div><div class="gymrat-stage"></div><section class="gymrat-result" aria-live="polite"></section></div>`;
  }

  function renderQuestion(dialog,state){
    const cfg=state.cfg,question=cfg.preguntas[state.index],stage=dialog.querySelector('.gymrat-stage'),result=dialog.querySelector('.gymrat-result');
    result.classList.remove('active');result.innerHTML='';stage.hidden=false;
    dialog.querySelector('.gymrat-progress-fill').style.width=`${(state.index/cfg.preguntas.length)*100}%`;
    stage.innerHTML=`<div class="gymrat-question-view">${state.index===0?`<p class="gymrat-intro">${esc(cfg.introduccion)}</p>`:''}<span class="gymrat-question-number">Pregunta ${state.index+1}</span><h3 class="gymrat-question-title">${esc(question.texto)}</h3><div class="gymrat-options">${(question.opciones||[]).map(option=>`<button class="gymrat-option" type="button" data-value="${esc(option)}">${esc(option)}</button>`).join('')}</div></div>`;
    stage.querySelectorAll('.gymrat-option').forEach(button=>button.addEventListener('click',()=>{
      if(state.locked)return;state.locked=true;button.classList.add('is-selected');state.answers[question.id]=button.dataset.value;
      const advance=()=>{state.index++;state.locked=false;if(state.index<cfg.preguntas.length)renderQuestion(dialog,state);else reveal(dialog,state);};
      if(reduceMotion())advance();else setTimeout(advance,260);
    }));
  }

  function reveal(dialog,state){
    const stage=dialog.querySelector('.gymrat-stage');
    dialog.querySelector('.gymrat-progress-fill').style.width='100%';
    stage.innerHTML='<div class="gymrat-reveal"><div class="gymrat-reveal-orbit" aria-hidden="true"></div><h3>LEYENDO TU ENERGÍA...</h3><p>Estamos cruzando tus respuestas con tu forma de entrenar.</p></div>';
    const finish=()=>showResult(dialog,state);if(reduceMotion())finish();else setTimeout(finish,900);
  }

  function showResult(dialog,state){
    const cfg=state.cfg,key=scoresFor(state.answers,cfg),profile=cfg.perfiles?.[key]||cfg.perfiles.dark,products=recommendations(profile,key,cfg,state.answers),stage=dialog.querySelector('.gymrat-stage'),result=dialog.querySelector('.gymrat-result');
    stage.hidden=true;
    const selectedColor=state.answers.color||'';
    result.innerHTML=`<span class="gymrat-result-badge">TU RESULTADO</span><h2 class="gymrat-result-title">${esc(profile.nombre||'GYMRAT')}</h2><p class="gymrat-result-copy">${esc(profile.texto||'')}</p><div class="gymrat-recs-head"><div><h3>SELECCIÓN PARA TI</h3><p>${selectedColor?`Solo prendas catalogadas en ${esc(selectedColor)}.`:'Filtrada por los colores catalogados de cada prenda.'}</p></div></div>${products.length?`<div class="gymrat-products">${products.map(productCard).join('')}</div>`:'<p class="gymrat-empty-recs">Todavía no hay prendas disponibles catalogadas con el color que elegiste. Asigna colores a tus productos desde el panel de administración y no mostraremos recomendaciones de un color incorrecto.</p>'}<div class="gymrat-result-actions"><button class="gymrat-restart" type="button">REPETIR TEST</button><a class="gymrat-shop" href="#catalogo">VER TODAS LAS PRENDAS</a></div>`;
    result.classList.add('active');result.querySelector('.gymrat-restart')?.addEventListener('click',()=>startQuiz(dialog,cfg));result.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>dialog.close()));dialog.scrollTo({top:0,behavior:reduceMotion()?'auto':'smooth'});
  }

  function startQuiz(dialog,cfg=settings()){
    cfg={...cfg,preguntas:(cfg.preguntas||[]).slice(0,4)};dialog.innerHTML=shellMarkup(cfg);dialog.querySelector('.gymrat-close')?.addEventListener('click',()=>dialog.close());renderQuestion(dialog,{cfg,index:0,answers:{},locked:false});
  }

  function openQuiz(event){event?.preventDefault();const cfg=settings();if(cfg.habilitado===false||cfg.habilitado==='false')return;const dialog=ensureDialog();startQuiz(dialog,cfg);dialog.showModal();}

  function setupButton(){
    const cfg=settings(),button=document.getElementById('heroButton2');if(!button)return;button.textContent=cfg.botonTexto||'GYMRAT TEST';button.href='#gymrat-test';button.hidden=cfg.habilitado===false||cfg.habilitado==='false';
    if(button.dataset.gymratV2Ready!=='1'){button.dataset.gymratV2Ready='1';button.addEventListener('click',openQuiz);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupButton,{once:true});else setupButton();window.addEventListener('haki:catalog-updated',setupButton);
})();
