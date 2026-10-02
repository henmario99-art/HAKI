(() => {
  const top=document.querySelector('.sales-topbar');
  top.innerHTML=`<button id="salesMenu" class="round" aria-label="Abrir menú de ventas">${hakiIcon('menu')}</button><div class="sales-period period-nav" role="group" aria-label="Mes y semana"><div class="period-fields"><input id="satinMonth" type="text" aria-label="Editar mes y año" autocomplete="off" spellcheck="false"><input id="satinWeek" type="text" aria-label="Editar semana del mes" autocomplete="off" inputmode="numeric" spellcheck="false"></div></div><button type="button" class="round panel-back" aria-label="Volver al administrador">${hakiIcon('back')}</button>`;
  const drawer=hakiDrawer(document.getElementById('salesMenu'),'HAKI');
  const tabs=document.querySelector('.sales-tabs');tabs.hidden=true;
  const nav=[['inventory','Inventario','box'],['collections','Cobros','card'],['expenses','Gastos','receipt'],['dashboard','Dashboard','chart'],['archived','Ventas archivadas','archive']];
  for(const [id,label,icon] of nav){const b=document.createElement('button');b.type='button';b.innerHTML=`${hakiIcon(icon)}<span>${label}</span><span>›</span>`;b.dataset.panel=id;b.onclick=()=>{drawer.close();document.querySelector(`.sales-tabs [data-tab="${id}"]`).click();};drawer.nav.append(b);}
  const periodNav=top.querySelector('.period-nav');
  const previousWeek=document.getElementById('prevWeek'),nextWeek=document.getElementById('nextWeek');
  previousWeek.innerHTML=hakiIcon('back');nextWeek.innerHTML=hakiIcon('back');nextWeek.classList.add('period-next');
  periodNav.prepend(previousWeek);periodNav.append(nextWeek);
  document.querySelector('.week-toolbar').hidden=true;
  let currentPanel='sales',fromPop=false;
  history.replaceState({panel:'sales'},'',location.pathname+'#sales');
  window.hakiPanelChanged=(panel)=>{
    if(!fromPop&&panel!==currentPanel)history.pushState({panel},'',`#${panel}`);
    currentPanel=panel;document.body.dataset.panel=panel;
    periodNav.hidden=panel==='inventory';
    top.querySelector('.panel-back').setAttribute('aria-label',panel==='sales'?'Volver al administrador':'Volver a la pantalla anterior');
    document.getElementById('saleEditor').hidden=true;document.body.classList.remove('sale-editor-mode');
    document.querySelector('.week-toolbar').hidden=true;
    drawer.nav.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.panel===panel));
    if(panel==='sales')loadWeek().catch(e=>toast(e.message,true));
  };
  top.querySelector('.panel-back').onclick=()=>{if(currentPanel==='sales')location.href='index.html?panel=1';else history.back();};
  window.addEventListener('popstate',e=>{fromPop=true;window.hakiSetPanel(e.state?.panel||'sales');fromPop=false;});
  document.getElementById('backFromArchived').onclick=()=>history.back();
  document.getElementById('collectionsView').querySelector('h1').innerHTML='<span class="cash-icon">$</span> P EXPRESS';
  document.getElementById('refreshCollections').innerHTML=hakiIcon('refresh')+'<span>Actualizar</span>';
  document.querySelector('#collectionsView .suite-summary article:first-child span').textContent='Total a cobrar';
  document.querySelector('#collectionsView .suite-summary article:last-child span').textContent='Pedidos';

  const metrics=document.querySelector('.metrics');document.getElementById('salesView').append(metrics);
  const unitCard=document.getElementById('metricUnits').closest('article');unitCard.querySelector('span').textContent='Pendiente';
  const pendingCard=document.getElementById('metricPending').closest('article');pendingCard.querySelector('span').textContent='A cobrar';metrics.insertBefore(pendingCard,unitCard);
  const opened=new Set();
  const net=s=>Math.max(0,(Number(s.total)||0)-(Number(s.comisionC807)||0));
  const monthField=document.getElementById('satinMonth'),weekField=document.getElementById('satinWeek');
  const firstWeek=(year,month)=>mondayOf(new Date(year,month,4,12));
  const weekCount=(year,month)=>Math.round((parseDate(firstWeek(year,month+1))-parseDate(firstWeek(year,month)))/604800000);
  function periodModel(){
    const thursday=parseDate(addDays(state.weekStart,3));
    const year=thursday.getFullYear(),month=thursday.getMonth();
    return {year,month,week:Math.round((parseDate(state.weekStart)-parseDate(firstWeek(year,month)))/604800000)+1};
  }
  function period(){
    const {year,month,week}=periodModel();
    monthField.value=months[month].replace(/^./,c=>c.toUpperCase())+' de '+year;
    weekField.value='Semana '+week;
  }
  function readMonth(value){
    const raw=value.trim().toLowerCase();let match;
    if((match=raw.match(/^(\d{4})-(\d{1,2})$/)))return {year:Number(match[1]),month:Number(match[2])-1};
    if((match=raw.match(/^(\d{1,2})[\/-](\d{4})$/)))return {year:Number(match[2]),month:Number(match[1])-1};
    match=raw.match(/^([a-z]+)\s+(?:de\s+)?(\d{4})$/);
    return match?{year:Number(match[2]),month:months.indexOf(match[1])}:null;
  }
  monthField.addEventListener('change',()=>{
    const selected=readMonth(monthField.value);
    if(!selected||selected.month<0||selected.month>11||selected.year<1900){period();toast('Escribe un mes y año, por ejemplo: Octubre de 2026.',true);return;}
    const week=Math.min(periodModel().week,weekCount(selected.year,selected.month));
    changeWeek(addDays(firstWeek(selected.year,selected.month),(week-1)*7));
  });
  weekField.addEventListener('change',()=>{
    const match=weekField.value.trim().match(/^(?:semana\s*)?([1-5])$/i);
    const {year,month}=periodModel();
    if(!match||Number(match[1])>weekCount(year,month)){period();toast('Ese mes tiene '+weekCount(year,month)+' semanas.',true);return;}
    changeWeek(addDays(firstWeek(year,month),(Number(match[1])-1)*7));
  });
  for(const field of [monthField,weekField]){
    field.addEventListener('focus',()=>field.select());
    field.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();field.blur();}else if(event.key==='Escape'){period();field.blur();}});
  }
  function updateMetrics(){
    const active=state.sales.filter(isActiveSale);
    document.getElementById('metricSales').textContent=money(active.reduce((n,s)=>n+Number(s.subtotal??s.total??0),0));
    document.getElementById('metricPending').textContent=money(active.filter(s=>s.dinero==='Pendiente').reduce((n,s)=>n+net(s),0));
    document.getElementById('metricUnits').textContent=active.filter(s=>s.estado==='Pendiente').length;
    document.getElementById('metricOrders').textContent=active.length;
    document.getElementById('metricUnclaimed').textContent=state.sales.filter(s=>s.estado==='No retirado').length;
  }
  function paint(select,field,value){select.className='';if(value==='Pendiente')select.classList.add('quick-pending');if(value==='Retirado'||value==='En caja')select.classList.add('quick-good');if(['Cancelado','No retirado','No retiró'].includes(value))select.classList.add('quick-bad');}
  function saleCard(sale){
    const card=document.createElement('article');card.className='satin-sale';card.dataset.saleId=sale.id;card.dataset.shippingStage=sale.etapaEnvio||'Pedido tomado';
    const summary=document.createElement('button');summary.type='button';summary.className='sale-copy';summary.setAttribute('aria-label',`Editar venta de ${sale.cliente}`);
    const codes=(sale.items||[]).map(i=>`${i.codigo} ${i.talla}${i.cantidad>1?' ×'+i.cantidad:''}`).join(' · ');
    summary.innerHTML=`<span class="sale-client-line">${channelBadge(sale.canal)}<strong>${escapeHtml(sale.cliente)} - ${escapeHtml(codes)}</strong></span><span class="sale-destination">${escapeHtml(sale.lugarHorario||'Sin destino')}</span>`;
    summary.onclick=()=>openEditSale(sale);
    const amount=document.createElement('strong');amount.className='amount';amount.textContent=money(net(sale));
    const controls=document.createElement('div');controls.className='sale-quick-controls';
    for(const [field,label,opts] of [['etapaEnvio','Etapa de envío',['Pedido tomado','Empacado','Enviado']],['estado','Estado',['Pendiente','Retirado','Cancelado','No retirado']],['dinero','Dinero',['Pendiente','En caja','No retiró']]]){
      const select=document.createElement('select');select.dataset.quickField=field;select.setAttribute('aria-label',`${label} de ${sale.cliente}`);
      opts.forEach(value=>{const o=document.createElement('option');o.value=value;o.textContent=value==='Pedido tomado'?'Tomado':value;select.append(o);});select.value=sale[field]||opts[0];paint(select,field,select.value);
      select.onchange=async()=>{controls.querySelectorAll('select').forEach(s=>s.disabled=true);try{
        const data=await api('sales',{method:'PATCH',body:JSON.stringify({id:sale.id,field,value:select.value,updatedAt:sale.updatedAt})});
        if(!data.sale)throw new Error('No se pudo confirmar el cambio.');Object.assign(sale,data.sale);state.inventory=data.inventory;renderWeek();toast('Pedido actualizado');
      }catch(e){select.value=sale[field]||opts[0];toast(e.message,true);}finally{controls.querySelectorAll('select').forEach(s=>s.disabled=false);}};controls.append(select);
    }
    card.append(summary,amount,controls);
    if(sale.fotoPaquete){const photo=document.createElement('button');photo.type='button';photo.className='sale-package';photo.setAttribute('aria-label',`Ver fotografía del paquete de ${sale.cliente}`);const img=document.createElement('img');img.src=sale.fotoPaquete;img.alt='Paquete';photo.append(img);photo.onclick=()=>hakiPhotoView(sale.fotoPaquete);card.append(photo);}
    return card;
  }
  renderWeek=function(){
    renderInventoryTotal();
    if(!state.weekStart)return;period();updateMetrics();const days=document.getElementById('days');days.replaceChildren();
    for(let i=0;i<7;i++){
      const date=addDays(state.weekStart,i);const rows=state.sales.filter(s=>s.fecha===date).sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
      const section=document.createElement('section');section.className='satin-day';
      const toggle=document.createElement('button');toggle.type='button';toggle.className='satin-day-toggle';toggle.setAttribute('aria-expanded',String(opened.has(date)));
      const sent=rows.filter(s=>s.etapaEnvio==='Enviado').length;
      toggle.innerHTML=`<span><strong>${weekdays[i]} ${parseDate(date).getDate()}</strong><small>${rows.length} ${rows.length===1?'paquete':'paquetes'} · ${sent} ${sent===1?'enviado':'enviados'}</small></span><b>${money(rows.filter(isActiveSale).reduce((n,s)=>n+net(s),0))}</b>`;
      const detail=document.createElement('div');detail.className='satin-day-detail';detail.hidden=!opened.has(date);
      const add=document.createElement('button');add.type='button';add.className='button primary day-add';add.textContent='+ Nueva venta';add.onclick=()=>openNewSale(date);detail.append(add);
      rows.forEach(s=>detail.append(saleCard(s)));
      toggle.onclick=()=>{detail.hidden=!detail.hidden;toggle.setAttribute('aria-expanded',String(!detail.hidden));if(detail.hidden)opened.delete(date);else opened.add(date);};
      section.append(toggle,detail);days.append(section);
    }
  };
  const previousSave=saveSale;saveSale=async function(){const date=document.getElementById('salePickupDate').value;if(date)opened.add(date);return previousSave();};

  // The original editor and order fields are retained; only their layout changes.
  let returnScroll=0;
  showEditor=function(){returnScroll=window.scrollY;document.getElementById('saleEditor').hidden=false;document.body.classList.add('sale-editor-mode');window.scrollTo(0,0);};
  hideEditor=function(){document.getElementById('saleEditor').hidden=true;document.body.classList.remove('sale-editor-mode');state.editing=null;state.previousWeekStart='';window.scrollTo(0,returnScroll);};
  ['closeDialog','cancelDialog'].forEach(id=>document.getElementById(id).addEventListener('click',()=>hideEditor()));
  const meta=document.querySelector('.order-meta');['saleDelivery','saleState','saleShippingStage','saleMoney','saleShipping'].forEach(id=>meta.append(document.getElementById(id).closest('label')));
  document.getElementById('saleState').addEventListener('change',()=>{
    if(document.getElementById('saleState').value==='Retirado')document.getElementById('saleShippingStage').value='Enviado';
  });
  const footer=document.querySelector('.editor-actions');
  const saveActions=document.createElement('div');saveActions.className='sale-save-actions';
  saveActions.append(document.getElementById('cancelDialog'),document.getElementById('saveSale'));meta.append(saveActions);
  document.getElementById('deleteSale').innerHTML=hakiIcon('trash');document.getElementById('deleteSale').setAttribute('aria-label','Archivar venta');
  const photoButton=document.createElement('button');photoButton.type='button';photoButton.className='upload-package';photoButton.setAttribute('aria-label','Añadir fotografía del paquete');photoButton.innerHTML=hakiIcon('image');
  const upload=document.createElement('input');upload.type='file';upload.accept='image/jpeg,image/png,image/webp';upload.hidden=true;
  const preview=document.createElement('div');preview.className='package-preview';preview.hidden=true;footer.before(preview);footer.append(photoButton,upload);
  let photo='';let uploading=false;
  function showPhoto(){preview.replaceChildren();preview.hidden=!photo;photoButton.setAttribute('aria-label',photo?'Cambiar fotografía del paquete':'Añadir fotografía del paquete');if(!photo)return;
    const img=document.createElement('img');img.src=photo;img.alt='Foto del paquete';img.onclick=()=>hakiPhotoView(photo);
    const remove=document.createElement('button');remove.type='button';remove.className='remove-photo';remove.setAttribute('aria-label','Quitar fotografía del paquete');remove.innerHTML=hakiIcon('close');remove.onclick=()=>{photo='';showPhoto();};preview.append(img,remove);
  }
  photoButton.onclick=()=>upload.click();
  upload.onchange=async()=>{const f=upload.files[0];if(!f)return;uploading=true;photoButton.disabled=true;document.getElementById('saveSale').disabled=true;
    try{const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));reader.readAsDataURL(f);});const result=await api('upload',{method:'POST',body:JSON.stringify({mime:f.type,name:f.name,base64})});photo=result.path;showPhoto();}
    catch(e){toast(e.message,true);}finally{uploading=false;photoButton.disabled=false;document.getElementById('saveSale').disabled=false;upload.value='';}
  };
  const resetOriginal=resetForm;resetForm=function(){resetOriginal();photo='';showPhoto();};
  const editOriginal=openEditSale;openEditSale=function(s){editOriginal(s);photo=s.fotoPaquete||'';showPhoto();state.shippingManual=true;document.getElementById('saleShipping').value=s.envio||0;updateTotals();};
  const formOriginal=formSale;formSale=function(){if(uploading)throw new Error('Espera a que termine la fotografía.');return {...formOriginal(),fotoPaquete:photo};};
  const items=document.getElementById('items');
  function itemLayout(){items.querySelectorAll('.item-row').forEach(row=>{
    if(row.dataset.satin)return;row.dataset.satin='1';const dims=document.createElement('div');dims.className='item-dimensions';['size','qty','price'].forEach(key=>dims.append(row.querySelector(`[data-item="${key}"]`).closest('label')));
    const remove=row.querySelector('[data-item="remove"]');const note=row.querySelector('[data-item="stock"]');row.querySelectorAll('.item-pair').forEach(p=>p.remove());row.append(dims,note,remove);
  });}
  new MutationObserver(itemLayout).observe(items,{childList:true});itemLayout();
  document.body.dataset.panel='sales';if(state.weekStart)renderWeek();
})();
