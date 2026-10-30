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
  const groups=[['general','Configuración general',general],['new-drop','Nuevo Drop',document.getElementById('newDropSettings')],['appearance','Apariencia, portada y bolsa',document.getElementById('experienceSettings')],['typography','Tipografía',document.getElementById('typographySettings')],['gymrat','GYMRAT TEST',document.getElementById('gymratSettings')],['shipping','Envíos y cambios',info]];
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
    save.hidden=id==='new-drop';
    if(id==='new-drop')window.HAKINewDropEditor?.open();
    window.HAKI_UI?.reveal(match?settings:document.getElementById('productsSection'));
    window.scrollTo(0,0);
  }
  history.replaceState({setting:null},'',location.pathname+location.search);
  settings.querySelector('.settings-back').onclick=()=>history.back();
  window.addEventListener('popstate',e=>showSetting(e.state?.setting));

  let photoUploadPending=false;
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
    const photoKeys=['imagen','imagen2','imagen3'];
    const replaceFile=document.createElement('input');replaceFile.type='file';replaceFile.accept=file.accept;replaceFile.hidden=true;
    let replaceKey=null;
    function changedPhotos(){
      for(const key of photoKeys){
        card.querySelector(`[data-field="${key}"]`).value=p[key]||'';
        const preview=card.querySelector(key==='imagen'?'.preview':`[data-preview="${key}"]`);
        if(preview){preview.hidden=key!=='imagen'&&!p[key];preview.src=resolveImage(p[key]||p.imagenRespaldo||'images/producto.svg');}
      }
      photos();card.dispatchEvent(new Event('productphotoschange',{bubbles:true}));
    }
    function setPhotos(values){photoKeys.forEach((key,i)=>{p[key]=values[i]||'';});changedPhotos();}
    function photos(focusIndex,focusAction){
      thumbs.replaceChildren();const keys=photoKeys.filter(key=>p[key]);
      keys.forEach((key,index)=>{
        const item=document.createElement('div');item.className='product-photo-item';
        const tile=document.createElement('div');tile.className='product-photo';const img=document.createElement('img');img.src=resolveImage(p[key]);img.alt=`Foto ${index+1} de ${p.nombre}`;
        const caption=document.createElement('span');caption.className='photo-position';caption.textContent=index===0?'1 · Portada':`Foto ${index+1}`;
        const x=document.createElement('button');x.type='button';x.className='remove-photo';x.setAttribute('aria-label',`Quitar foto ${index+1}`);x.innerHTML=hakiIcon('close');x.disabled=photoUploadPending;
        x.onclick=()=>{if(!photoUploadPending)setPhotos(keys.filter(k=>k!==key).map(k=>p[k]));};
        const controls=document.createElement('div');controls.className='photo-controls';
        const replace=document.createElement('button');replace.type='button';replace.className='replace-photo';replace.textContent='Reemplazar';replace.setAttribute('aria-label',`Reemplazar foto ${index+1}`);replace.disabled=photoUploadPending;
        replace.onclick=()=>{if(photoUploadPending)return;replaceKey=key;replaceFile.value='';replaceFile.click();};
        const order=document.createElement('div');order.className='photo-order';
        for(const [step,label,symbol] of [[-1,'antes','←'],[1,'después','→']]){
          const move=document.createElement('button');move.type='button';move.className='move-photo';move.dataset.step=step;move.textContent=symbol;move.setAttribute('aria-label',`Mover foto ${index+1} ${label}`);move.title=`Mover ${label}`;move.disabled=photoUploadPending||index+step<0||index+step>=keys.length;
          move.onclick=()=>{if(photoUploadPending)return;const values=keys.map(k=>p[k]);[values[index],values[index+step]]=[values[index+step],values[index]];setPhotos(values);photos(index+step,step);};order.append(move);
        }
        tile.append(img,caption,x);controls.append(replace,order);item.append(tile,controls);thumbs.append(item);
      });
      add.disabled=photoUploadPending||keys.length>=3;add.title=keys.length>=3?'Máximo 3 imágenes':'Añadir imagen';images.dataset.count=keys.length;
      if(focusIndex!==undefined){const item=thumbs.children[focusIndex];const move=item?.querySelector(`[data-step="${focusAction}"]`);(move&&!move.disabled?move:item?.querySelector('.replace-photo'))?.focus({preventScroll:true});}
    }
    async function uploadPhotos(files,targets){
      if(photoUploadPending||!files.length)return;
      photoUploadPending=true;
      const buttons=[...document.querySelectorAll('#products .product-images button, #saveBtn, #saveOrderBtn, #reorderBtn, #addBtn')].map(button=>({button,disabled:button.disabled}));
      buttons.forEach(({button})=>{button.disabled=true;});
      try{for(const [i,f] of files.entries()){
        const data=await api('upload',{method:'POST',body:JSON.stringify({name:f.name,mime:f.type,base64:await fileToBase64(f)})});
        if(!data.path)throw new Error('No se pudo subir la imagen. Inténtalo de nuevo.');
        p[targets[i]]=data.path;changedPhotos();
      }toast('Imágenes listas. Pulsa GUARDAR.',true);}catch(e){toast(e.message);}finally{
        photoUploadPending=false;file.value='';replaceFile.value='';replaceKey=null;buttons.forEach(({button,disabled})=>{button.disabled=disabled;});photos();
      }
    }
    add.onclick=()=>file.click();
    file.onchange=async()=>{
      const remaining=photoKeys.filter(k=>!p[k]);
      if(file.files.length>remaining.length){toast('Puedes añadir hasta 3 imágenes.');file.value='';return;}
      await uploadPhotos([...file.files],remaining);
    };
    replaceFile.onchange=async()=>{const replacement=replaceFile.files?.[0];if(replacement&&replaceKey)await uploadPhotos([replacement],[replaceKey]);};
    actions.append(add,more,file,replaceFile);images.append(thumbs,actions);body.append(basic,images,advanced);card.append(body);photos();
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
