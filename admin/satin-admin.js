(() => {
  const admin=document.getElementById('adminView');
  const top=admin.querySelector('.topbar');
  top.innerHTML=`<button id="adminMenu" class="round" aria-label="Abrir menú de edición">${hakiIcon('menu')}</button><div class="brand">HAKI</div><button id="toggleSearch" class="round" aria-label="Buscar prenda">${hakiIcon('search')}</button>`;
  const drawer=hakiDrawer(document.getElementById('adminMenu'),'HAKI');
  const toolbar=admin.querySelector('.toolbar');
  const sales=document.createElement('a');sales.href='sales.html';sales.className='ghost admin-sales-link';sales.textContent='VENTAS';
  const tools=document.createElement('div');tools.className='admin-product-tools';tools.append(document.getElementById('addBtn'),document.getElementById('reorderBtn'));
  const search=document.getElementById('search');search.hidden=true;search.classList.add('satin-search');
  const save=document.getElementById('saveBtn');save.textContent='GUARDAR';document.getElementById('saveOrderBtn').textContent='Guardar';
  toolbar.replaceChildren(sales,save);toolbar.after(search);drawer.nav.after(tools);
  document.getElementById('toggleSearch').onclick=()=>{search.hidden=!search.hidden;if(!search.hidden)search.focus();};
  const settings=document.createElement('section');settings.className='settings-page';settings.hidden=true;
  settings.innerHTML=`<header><button type="button" class="round settings-back" aria-label="Volver">${hakiIcon('back')}</button><h1></h1></header><div class="settings-content"></div>`;
  document.getElementById('productsSection').before(settings);
  const cards=[...admin.querySelectorAll('.config-card')];
  const general=cards.find(c=>c.querySelector('h2')?.textContent==='Configuración general');
  const categories=cards.find(c=>c.querySelector('h2')?.textContent==='Las cuatro categorías de inicio');
  if(categories&&general){const d=document.createElement('details');d.innerHTML='<summary>Categorías de inicio</summary>';d.append(...[...categories.children].filter(n=>n.tagName!=='H2'));general.append(d);categories.remove();}
  const info=cards.find(c=>/Encomiendas, domicilios/.test(c.querySelector('h2')?.textContent||''));
  const groups=[['general','Configuración general',general],['appearance','Apariencia, portada y bolsa',document.getElementById('experienceSettings')],['typography','Tipografía',document.getElementById('typographySettings')],['gymrat','GYMRAT TEST',document.getElementById('gymratSettings')],['shipping','Envíos y cambios',info]];
  groups.forEach(([id,title,card])=>{
    if(card){card.hidden=true;card.dataset.setting=id;settings.querySelector('.settings-content').append(card);}
    const btn=document.createElement('button');btn.type='button';btn.innerHTML=`${hakiIcon('settings')}<span>${title}</span><span>›</span>`;
    btn.onclick=()=>{drawer.close();history.pushState({setting:id},'',`#${id}`);showSetting(id);};drawer.nav.append(btn);
  });
  const catalogLink=document.createElement('button');catalogLink.type='button';
  catalogLink.innerHTML=`${hakiIcon('image')}<span>Ver catálogo</span><span>›</span>`;
  catalogLink.onclick=()=>{drawer.close();window.open('/','_blank','noopener');};drawer.nav.append(catalogLink);
  const logout=document.createElement('button');logout.type='button';logout.innerHTML=`${hakiIcon('back')}<span>Cerrar sesión</span><span>›</span>`;
  logout.onclick=async()=>{await api('auth',{method:'DELETE'});location.replace('/admin/');};drawer.nav.append(logout);
  let currentSetting=null;
  function syncSettings(){
    for(const [id,domId] of [['typography','typographySettings'],['gymrat','gymratSettings']]){
      const card=document.getElementById(domId);const g=groups.find(g=>g[0]===id);
      if(card&&g[2]!==card){g[2]=card;card.hidden=currentSetting!==id;card.dataset.setting=id;settings.querySelector('.settings-content').append(card);}
    }
  }
  setInterval(syncSettings,200);
  function showSetting(id){
    currentSetting=id;syncSettings();
    const match=groups.find(g=>g[0]===id);
    settings.hidden=!match;document.getElementById('productsSection').hidden=!!match;search.hidden=true;
    groups.forEach(g=>{if(g[2])g[2].hidden=g!==match;});
    if(match)settings.querySelector('h1').textContent=match[1];
    window.HAKI_UI?.reveal(match?settings:document.getElementById('productsSection'));
    window.scrollTo(0,0);
  }
  history.replaceState({setting:null},'',location.pathname+location.search);
  settings.querySelector('.settings-back').onclick=()=>history.back();
  window.addEventListener('popstate',e=>showSetting(e.state?.setting));

  const originals=renderProducts;
  const expanded=new Set();
  renderProducts=function(options={}){if(options.collapse)expanded.clear();originals();document.querySelectorAll('#products .product-card').forEach((card,index)=>{
    const p=state.filtered[index];if(!p)return;
    const head=card.querySelector('.product-head');const remove=card.querySelector('.remove-btn');
    const toggle=document.createElement('button');toggle.className='product-toggle';toggle.type='button';
    toggle.append(...head.firstElementChild.childNodes);toggle.insertAdjacentHTML('beforeend',hakiIcon('down'));head.replaceWith(toggle);
    const body=document.createElement('div');body.className='product-body';body.hidden=!expanded.has(p.id);toggle.setAttribute('aria-expanded',String(!body.hidden));
    const advanced=document.createElement('div');advanced.className='product-advanced';advanced.hidden=true;advanced.id=`advanced-${p.id}`;
    const basic=document.createElement('div');basic.className='product-basic';
    ['codigo','precio','descripcion'].forEach(key=>{const field=card.querySelector(`[data-field="${key}"]`)?.closest('label');if(field){field.className=key==='descripcion'?'description-field':'';basic.append(field);}});
    const collapse=document.createElement('button');collapse.className='round product-collapse';collapse.type='button';collapse.setAttribute('aria-label','Cerrar prenda');collapse.innerHTML=hakiIcon('down');basic.append(collapse);
    [...card.children].filter(n=>n!==toggle).forEach(n=>advanced.append(n));advanced.append(remove);
    const images=document.createElement('div');images.className='product-images';
    const thumbs=document.createElement('div');thumbs.className='product-thumbs';
    const actions=document.createElement('div');actions.className='product-image-actions';
    const add=document.createElement('button');add.type='button';add.className='round add-photo';add.setAttribute('aria-label','Añadir imagen a la prenda');add.innerHTML=hakiIcon('image');
    const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp,image/gif';file.hidden=true;file.multiple=true;
    const more=document.createElement('button');more.type='button';more.className='round more-product';more.setAttribute('aria-label','Desplegar color, categorías y demás información');more.setAttribute('aria-expanded','false');more.setAttribute('aria-controls',advanced.id);more.innerHTML=hakiIcon('down');
    more.onclick=()=>{advanced.hidden=!advanced.hidden;more.setAttribute('aria-expanded',String(!advanced.hidden));};
    function photos(){
      thumbs.replaceChildren();let count=0;
      for(const key of ['imagen','imagen2','imagen3']){if(!p[key])continue;count++;
        const tile=document.createElement('div');tile.className='product-photo';const img=document.createElement('img');img.src=resolveImage(p[key]);img.alt=`Foto ${count} de ${p.nombre}`;
        const x=document.createElement('button');x.type='button';x.className='remove-photo';x.setAttribute('aria-label',`Quitar foto ${count}`);x.innerHTML=hakiIcon('close');
        x.onclick=()=>{const values=['imagen','imagen2','imagen3'].filter(k=>k!==key).map(k=>p[k]).filter(Boolean);['imagen','imagen2','imagen3'].forEach((k,i)=>{p[k]=values[i]||'';card.querySelector(`[data-field="${k}"]`).value=p[k];});photos();};tile.append(img,x);thumbs.append(tile);
      }
      add.disabled=count>=3;add.title=count>=3?'Máximo 3 imágenes':'Añadir imagen';images.dataset.count=count;
    }
    add.onclick=()=>file.click();
    file.onchange=async()=>{
      const remaining=['imagen','imagen2','imagen3'].filter(k=>!p[k]);
      if(file.files.length>remaining.length){toast('Puedes añadir hasta 3 imágenes.');file.value='';return;}
      add.disabled=true;save.disabled=true;
      try{for(const [i,f] of [...file.files].entries()){
        const data=await api('upload',{method:'POST',body:JSON.stringify({name:f.name,mime:f.type,base64:await fileToBase64(f)})});p[remaining[i]]=data.path;card.querySelector(`[data-field="${remaining[i]}"]`).value=data.path;
      }toast('Imágenes listas. Pulsa GUARDAR.',true);}catch(e){toast(e.message);}finally{file.value='';save.disabled=false;photos();}
    };
    actions.append(add,more,file);images.append(thumbs,actions);body.append(basic,images,advanced);card.append(body);photos();
    function change(){body.hidden=!body.hidden;toggle.setAttribute('aria-expanded',String(!body.hidden));if(body.hidden)expanded.delete(p.id);else {expanded.add(p.id);window.HAKI_UI?.reveal(body);}}
    const title=toggle.querySelector('.product-title');
    toggle.title='Doble clic para editar el nombre';
    let clickTimer,originalName;
    function finishName(cancel=false){
      if(!title.isContentEditable)return;
      const next=title.textContent.trim();
      p.nombre=cancel||!next?originalName:next;
      title.textContent=p.nombre;title.removeAttribute('contenteditable');title.removeAttribute('role');
      title.classList.remove('is-editing');
    }
    function editName(event){
      if(title.isContentEditable)return;
      event.preventDefault();event.stopPropagation();clearTimeout(clickTimer);
      originalName=p.nombre;title.contentEditable='plaintext-only';title.setAttribute('role','textbox');
      title.setAttribute('aria-label','Nombre de la prenda');title.classList.add('is-editing');title.focus();
      const range=document.createRange();range.selectNodeContents(title);
      const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
    }
    toggle.addEventListener('dblclick',editName);
    title.addEventListener('keydown',event=>{
      if(!title.isContentEditable)return;
      event.stopPropagation();
      if(event.key==='Enter'||event.key==='Escape'){event.preventDefault();finishName(event.key==='Escape');title.blur();toggle.focus();}
    });
    title.addEventListener('blur',()=>finishName());
    toggle.addEventListener('keydown',event=>{if(event.key==='F2')editName(event);});
    toggle.onclick=event=>{
      if(title.isContentEditable)return;
      clearTimeout(clickTimer);
      if(event.detail){if(event.detail===1)clickTimer=setTimeout(change,250);}
      else change();
    };
    collapse.onclick=change;
  });};
  document.getElementById('addBtn').addEventListener('click',()=>{drawer.close();showSetting(null);const first=document.querySelector('.product-toggle');if(first?.getAttribute('aria-expanded')==='false')first.click();});
  if(state.products.length)renderProducts();
})();
