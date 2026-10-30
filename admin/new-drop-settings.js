(() => {
  if (inventoryEditorProductId) return;
  const card = document.createElement('section');
  card.id = 'newDropSettings';
  card.className = 'config-card';
  card.innerHTML = `
    <h2>Nuevo Drop</h2>
    <p>Elige las prendas y el orden en que aparecerán al entrar a Nuevo Drop.</p>
    <div class="drop-toolbar"><strong id="dropCount"></strong><button id="dropAdd" type="button" class="ghost">+ Añadir prendas</button></div>
    <p class="drop-help">Usa las flechas o escribe la posición. Las prendas agotadas o en borrador quedan guardadas en tu selección y se muestran cuando estén disponibles.</p>
    <ol id="dropList" class="drop-list" aria-label="Orden de Nuevo Drop"></ol>
    <p id="dropEmpty" class="drop-empty" hidden>Tu Nuevo Drop está vacío. Añade las prendas que quieres mostrar.</p>
    <div class="drop-footer"><p id="dropStatus" role="status" aria-live="polite"></p><div><button id="dropReset" class="ghost" type="button">Descartar cambios</button><button id="dropSave" class="primary" type="button">Guardar Nuevo Drop</button></div></div>`;
  document.getElementById('productsSection').before(card);
  const picker = document.createElement('dialog');
  picker.className = 'drop-picker';picker.setAttribute('aria-labelledby','dropPickerTitle');
  picker.innerHTML = `<header><h2 id="dropPickerTitle">Elegir prendas</h2><button type="button" class="round" id="dropPickerClose" aria-label="Cerrar selección de prendas">${hakiIcon('close')}</button></header><div class="drop-picker-search"><input id="dropSearch" type="search" placeholder="Buscar por nombre o código" aria-label="Buscar prendas para Nuevo Drop"></div><div id="dropOptions" class="drop-options"></div><footer><span id="dropPickerCount" role="status"></span><button id="dropPickerDone" type="button" class="primary">Listo</button></footer>`;
  document.body.append(picker);
  const list=card.querySelector('#dropList'),status=card.querySelector('#dropStatus');
  const save=card.querySelector('#dropSave'),reset=card.querySelector('#dropReset'),add=card.querySelector('#dropAdd');
  let savedIds=[],draftIds=[],loaded=false,busy=false;
  const key=p=>String(p.id);
  const selectedProducts=()=>draftIds.map(id=>state.products.find(p=>key(p)===id)).filter(Boolean);
  const changed=()=>JSON.stringify(savedIds)!==JSON.stringify(draftIds);
  const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function message(product) {
    return product.borrador===true ? 'Borrador · Oculta en el catálogo' : !['S','M','L','XL'].some(size=>product.tallas?.[size]) ? 'Agotada · Pendiente de stock' : '';
  }
  function sync() {
    save.disabled=!loaded||busy||!changed();reset.disabled=busy||!changed();add.disabled=!loaded||busy;
    save.textContent=busy?'Guardando…':'Guardar Nuevo Drop';
    card.querySelector('#dropCount').textContent=`${draftIds.length} prenda${draftIds.length===1?'':'s'}`;
    picker.querySelector('#dropPickerCount').textContent=`${draftIds.length} seleccionada${draftIds.length===1?'':'s'}`;
  }
  function updated() {status.textContent=changed()?'Cambios sin guardar.':'Selección guardada.';render();}
  function move(id,index) {
    const from=draftIds.indexOf(id);if(from<0)return;
    const to=Math.max(0,Math.min(draftIds.length-1,Math.trunc(Number(index))||0));
    draftIds.splice(from,1);draftIds.splice(to,0,id);updated();
    list.querySelector(`[data-drop-id="${CSS.escape(id)}"] .drop-position input`)?.focus();
  }
  function productInfo(product) {
    const copy=document.createElement('div');copy.className='drop-product-info';
    const name=document.createElement('strong');name.textContent=product.nombre||'Sin nombre';
    const code=document.createElement('small');code.textContent=product.codigo||'Sin código';copy.append(name,code);
    const note=message(product);if(note){const text=document.createElement('small');text.className='drop-availability';text.textContent=note;copy.append(text);}
    return copy;
  }
  function image(product) {
    const img=document.createElement('img');img.src=resolveImage(product.imagen||product.imagenRespaldo);img.alt='';img.loading='lazy';
    img.onerror=()=>{img.onerror=null;img.src=resolveImage('images/producto.svg');};return img;
  }
  function render() {
    list.replaceChildren();
    selectedProducts().forEach((product,index)=>{
      const id=key(product),name=product.nombre||product.codigo;
      const row=document.createElement('li');row.className='drop-row';row.dataset.dropId=id;
      const controls=document.createElement('div');controls.className='drop-order-controls';
      const up=document.createElement('button');up.type='button';up.textContent='↑';up.setAttribute('aria-label',`Subir ${name}`);up.disabled=busy||index===0;up.onclick=()=>move(id,index-1);
      const down=document.createElement('button');down.type='button';down.textContent='↓';down.setAttribute('aria-label',`Bajar ${name}`);down.disabled=busy||index===draftIds.length-1;down.onclick=()=>move(id,index+1);
      const position=document.createElement('label');position.className='drop-position';position.textContent='Posición';
      const input=document.createElement('input');input.type='number';input.min='1';input.max=String(draftIds.length);input.step='1';input.value=String(index+1);input.disabled=busy;input.setAttribute('aria-label',`Posición de ${name}`);
      const apply=()=>{if(!Number.isFinite(input.valueAsNumber)){input.value=String(index+1);return;}move(id,input.valueAsNumber-1);};input.onchange=apply;input.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();apply();}};
      position.append(input);controls.append(up,down,position);
      const remove=document.createElement('button');remove.type='button';remove.className='drop-remove';remove.innerHTML=hakiIcon('close');remove.setAttribute('aria-label',`Quitar ${name} de Nuevo Drop`);remove.disabled=busy;
      remove.onclick=()=>{draftIds=draftIds.filter(value=>value!==id);updated();add.focus();};
      row.append(image(product),productInfo(product),remove,controls);list.append(row);
    });
    card.querySelector('#dropEmpty').hidden=!loaded||draftIds.length>0;sync();
  }
  function options() {
    const wrap=picker.querySelector('#dropOptions'),q=clean(picker.querySelector('#dropSearch').value.trim());
    wrap.replaceChildren();
    const products=state.products.filter(p=>clean(`${p.nombre} ${p.codigo}`).includes(q));
    products.forEach(product=>{
      const label=document.createElement('label');label.className='drop-option';label.dataset.productId=key(product);
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=draftIds.includes(key(product));checkbox.setAttribute('aria-label',`Incluir ${product.nombre||product.codigo} en Nuevo Drop`);
      checkbox.onchange=()=>{draftIds=draftIds.filter(id=>id!==key(product));if(checkbox.checked)draftIds.push(key(product));updated();};
      label.append(image(product),productInfo(product),checkbox);wrap.append(label);
    });
    if(!products.length){const empty=document.createElement('p');empty.className='drop-empty';empty.textContent='No se encontraron prendas.';wrap.append(empty);}
  }
  function load() {
    if(!state.catalogSha)return;
    if(!loaded||!changed()){
      savedIds=window.hakiDropProducts(state.config,state.products).map(key);draftIds=[...savedIds];loaded=true;
      status.textContent='Los cambios se publican al guardar Nuevo Drop.';render();
    }
  }
  reset.onclick=()=>{draftIds=[...savedIds];updated();};
  add.onclick=()=>{picker.querySelector('#dropSearch').value='';options();picker.showModal();picker.querySelector('#dropPickerClose').focus();};
  const close=()=>picker.close();
  picker.querySelector('#dropPickerClose').onclick=close;picker.querySelector('#dropPickerDone').onclick=close;
  picker.addEventListener('close',()=>add.focus());
  picker.querySelector('#dropSearch').oninput=options;
  save.onclick=async()=>{
    if(busy||!loaded||!changed())return;
    busy=true;status.textContent='Guardando Nuevo Drop…';render();
    try {
      const ids=[...draftIds];
      const data=await api('catalog',{method:'PATCH',body:JSON.stringify({config:{nuevoDropIds:ids},sha:state.catalogSha})});
      state.catalogSha=data.sha||state.catalogSha;state.config.nuevoDropIds=ids;
      savedIds=ids;status.textContent='Nuevo Drop guardado y publicado.';toast('Nuevo Drop guardado y publicado.',true);
    } catch(error) {status.textContent=error.message;toast(error.message);}
    finally {busy=false;render();}
  };
  window.HAKINewDropEditor={catalogLoaded:load,open(){load();render();}};
  render();
})();
