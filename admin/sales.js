const $=(s,e=document)=>e.querySelector(s);
const $$=(s,e=document)=>[...e.querySelectorAll(s)];
const API='/.netlify/functions';
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)||0);
const weekdays=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const state={products:[],inventory:{},sales:[],archived:[],weekStart:'',editing:null,previousWeekStart:''};
const C807_GUIDE_COST=4.15;

async function api(path,options={}) {
  if (/^sales(?:\?|$)/.test(path) && window.hakiSupabaseSalesApi) {
    return window.hakiSupabaseSalesApi(path, options);
  }
  const res=await fetch(`${API}/${path}`, {
    credentials:'same-origin', ...options,
    headers:{'content-type':'application/json',...(options.headers||{})},
    signal:options.signal || AbortSignal.timeout(20000)
  });
  const data=await res.json().catch(()=>null);
  if(!res.ok || !data) throw new Error(data?.error || `No se pudo conectar con HAKI (${res.status}). Intenta de nuevo.`);
  return data;
}
function channelBadge(value) {
  const raw=String(value || '').trim();
  const key=raw.toLowerCase();
  const channel=key.includes('whats')?'whatsapp':key.includes('insta')?'instagram':'other';
  const label=channel==='whatsapp'?'WhatsApp':channel==='instagram'?'Instagram':raw || 'Sin canal';
  return `<span class="sale-channel sale-channel-${channel}" aria-label="Canal: ${escapeHtml(label)}">${escapeHtml(label)}</span>`;
}
function toast(message,error=false){const el=$('#status');el.textContent=message;el.classList.toggle('error',error);el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2800)}
function isoDate(date){const y=date.getFullYear();const m=String(date.getMonth()+1).padStart(2,'0');const d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`}
function parseDate(iso){return new Date(`${iso}T12:00:00`)}
function addDays(iso,days){const d=parseDate(iso);d.setDate(d.getDate()+days);return isoDate(d)}
function mondayOf(value){const d=value instanceof Date?new Date(value):parseDate(value);const offset=(d.getDay()+6)%7;d.setDate(d.getDate()-offset);return isoDate(d)}
function formatDate(iso,withYear=false){const d=parseDate(iso);return `${d.getDate()} de ${months[d.getMonth()]}${withYear?` de ${d.getFullYear()}`:''}`}
function stockFor(productId){return state.inventory[String(productId)]||{S:0,M:0,L:0,XL:0}}
function isActiveSale(sale){return !['Cancelado','No retirado'].includes(sale.estado)}
function escapeHtml(value=''){return String(value).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]))}
function badgeClass(value){const v=String(value||'').toLowerCase();if(v.includes('whats'))return'whatsapp';if(v.includes('mess'))return'messenger';return'instagram'}
function stateClass(value){if(value==='Retirado')return'done';if(value==='Cancelado'||value==='No retirado')return'cancelled';return'pending'}
function moneyClass(value){return value==='En caja'?'done':value==='No retiró'?'cancelled':'pending'}
function isC807Delivery(value){return String(value||'').toLowerCase().includes('c807')}
function calculateC807Commission(amount){
  const total=Math.max(0,Number(amount)||0);
  if(total<=0)return 0;
  if(total<=25)return 1;
  return Number((total*.04).toFixed(2));
}
function saleC807Commission(sale){
  if(!isC807Delivery(sale?.entrega))return 0;
  const stored=Number(sale?.comisionC807);
  if(Number.isFinite(stored)&&stored>=0)return stored;
  return sale?.dinero==='Pendiente'?calculateC807Commission(sale?.total):0;
}
function editorC807Commission(total,delivery,moneyState){
  if(!isC807Delivery(delivery)||moneyState==='No retiró')return 0;
  const stored=Number(state.editing?.comisionC807);
  if(moneyState==='En caja')return Number.isFinite(stored)&&stored>0?stored:0;
  return calculateC807Commission(total);
}
function c807GuideCost(delivery){return isC807Delivery(delivery)?C807_GUIDE_COST:0}

async function ensureAuth(){
  const auth=window.hakiOperationalSession
    ? await window.hakiOperationalSession()
    : await api('auth',{method:'GET'});
  if(!auth.authenticated){location.href='/admin/';return false}
  return true;
}
async function loadProducts(){const data=await api('catalog',{method:'GET'});state.products=data.products||[];if(Object.keys(state.inventory).length)renderInventory()}
async function loadWeek(){const data=await api(`sales?weekStart=${encodeURIComponent(state.weekStart)}`,{method:'GET'});state.weekStart=data.weekStart;state.sales=data.sales||[];state.inventory=data.inventory||{};renderWeek();renderInventory()}

function renderWeek(){
  $('#weekTitle').textContent='Semana de 7 días';
  $('#weekRange').textContent=`${formatDate(state.weekStart)} – ${formatDate(addDays(state.weekStart,6),true)}`;
  const active=state.sales.filter(isActiveSale);
  $('#metricSales').textContent=money(active.reduce((sum,s)=>sum+(Number(s.total)||0),0));
  $('#metricUnits').textContent=String(active.reduce((sum,s)=>sum+(s.items||[]).reduce((a,i)=>a+(Number(i.cantidad)||0),0),0));
  $('#metricPending').textContent=money(active.filter(s=>s.dinero==='Pendiente').reduce((sum,s)=>sum+(Number(s.total)||0),0));
  $('#metricOrders').textContent=String(active.length);
  const days=$('#days');days.replaceChildren();
  for(let i=0;i<7;i++){
    const date=addDays(state.weekStart,i);
    const sales=state.sales.filter(s=>s.fecha===date).sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
    const section=document.createElement('section');section.className='day-card';
    const head=document.createElement('header');head.className='day-head';head.innerHTML=`<div><h2>${weekdays[i]}</h2><span>${formatDate(date)}</span></div><button class="day-new" type="button">+ Venta</button>`;
    $('.day-new',head).addEventListener('click',()=>openNewSale(date));section.append(head);
    if(!sales.length){const empty=document.createElement('div');empty.className='empty-day';empty.textContent='Sin ventas registradas.';section.append(empty);days.append(section);continue}
    const table=document.createElement('table');table.className='sale-table';table.innerHTML='<thead><tr><th>Canal</th><th>Cliente</th><th>Pedido</th><th>Total</th><th>Comisión</th><th>Entrega</th><th>Estado</th><th>Dinero</th></tr></thead>';
    const body=document.createElement('tbody');
    sales.forEach(sale=>{const tr=document.createElement('tr');tr.dataset.sale=sale.id;const items=(sale.items||[]).map(i=>`${i.codigo} ${i.talla}${Number(i.cantidad)>1?` ×${i.cantidad}`:''}`);const commission=saleC807Commission(sale);tr.innerHTML=`<td data-label="Canal"><span class="badge ${badgeClass(sale.canal)}">${escapeHtml(sale.canal)}</span></td><td data-label="Cliente">${escapeHtml(sale.cliente||'—')}</td><td data-label="Pedido" class="order-summary"><strong>${escapeHtml(items.slice(0,2).join(' · ')||'—')}</strong>${items.length>2?`<small>+${items.length-2} más</small>`:''}</td><td data-label="Total"><strong>${money(sale.total)}</strong></td><td data-label="Comisión">${isC807Delivery(sale.entrega)?`<strong>${money(commission)}</strong>`:'—'}</td><td data-label="Entrega">${escapeHtml(sale.entrega||'—')}</td><td data-label="Estado"><span class="badge ${stateClass(sale.estado)}">${escapeHtml(sale.estado)}</span></td><td data-label="Dinero"><span class="badge ${moneyClass(sale.dinero)}">${escapeHtml(sale.dinero)}</span></td>`;tr.addEventListener('click',()=>openEditSale(sale));body.append(tr)});
    table.append(body);section.append(table);days.append(section)
  }
}

function switchTab(name){
  const archived=name==='archived';
  $$('.tab').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.tab===name));
  $('#salesView').hidden=!['sales','archived'].includes(name);
  $('#inventoryView').hidden=name!=='inventory';
  const archivedView=$('#archivedSalesView');
  const days=$('#days');
  const metrics=$('.metrics');
  const toolbar=$('.week-toolbar');
  if(archivedView)archivedView.hidden=!archived;
  if(days)days.hidden=archived;
  if(metrics)metrics.hidden=archived;
  if(toolbar)toolbar.hidden=archived;
  if(name==='inventory')renderInventory();
  if(archived){hideEditor();loadArchivedSales().catch(err=>toast(err.message,true))}
}
function renderInventory(){if(!state.products.length)return;const q=($('#inventorySearch').value||'').trim().toLowerCase();const wrap=$('#inventoryList');wrap.replaceChildren();state.products.filter(p=>!q||`${p.codigo} ${p.nombre}`.toLowerCase().includes(q)).forEach(product=>{const stock=stockFor(product.id);const row=document.createElement('article');row.className='inventory-row';const productInfo=document.createElement('div');productInfo.className='inventory-product';productInfo.innerHTML=`<strong>${escapeHtml(product.nombre)}</strong><small>${escapeHtml(product.codigo)}</small>`;row.append(productInfo);['S','M','L','XL'].forEach(size=>{const label=document.createElement('label');label.innerHTML=`<span>${size}</span><input type="number" min="0" step="1" value="${Number(stock[size])||0}" data-stock="${size}">`;row.append(label)});const total=document.createElement('div');total.className='inventory-total';total.textContent=String(['S','M','L','XL'].reduce((a,s)=>a+(Number(stock[s])||0),0));row.append(total);const save=document.createElement('button');save.type='button';save.className='button secondary';save.textContent='Guardar';save.addEventListener('click',async()=>{save.disabled=true;try{const next={};$$('[data-stock]',row).forEach(input=>next[input.dataset.stock]=Math.max(0,Math.trunc(Number(input.value)||0)));const data=await api('sales?mode=inventory',{method:'PUT',body:JSON.stringify({productId:product.id,productCode:product.codigo,stock:next})});state.inventory=data.inventory||state.inventory;total.textContent=String(Object.values(next).reduce((a,b)=>a+b,0));toast('Inventario guardado')}catch(err){toast(err.message,true)}finally{save.disabled=false}});$$('[data-stock]',row).forEach(input=>input.addEventListener('input',()=>{total.textContent=String($$('[data-stock]',row).reduce((sum,el)=>sum+Math.max(0,Math.trunc(Number(el.value)||0)),0))}));wrap.append(row)})}

function productOptions(selectedId=''){return state.products.map(p=>`<option value="${p.id}" ${String(p.id)===String(selectedId)?'selected':''}>${escapeHtml(p.codigo)} — ${escapeHtml(p.nombre)}</option>`).join('')}
function addItemRow(item={}){const tpl=$('#itemTemplate').content.cloneNode(true);const row=$('.item-row',tpl);const product=$('[data-item="product"]',row);product.innerHTML='<option value="">Selecciona una prenda</option>'+productOptions(item.productId);const size=$('[data-item="size"]',row);size.value=item.talla||'S';const qty=$('[data-item="qty"]',row);qty.value=item.cantidad||1;const price=$('[data-item="price"]',row);price.value=item.precio??'';const updateProduct=()=>{const p=state.products.find(x=>String(x.id)===product.value);if(p)price.value=Number(p.precio||0).toFixed(2);updateStockNote(row);updateTotals()};product.addEventListener('change',updateProduct);size.addEventListener('change',()=>updateStockNote(row));qty.addEventListener('input',()=>{updateStockNote(row);updateTotals()});price.addEventListener('input',updateTotals);$('[data-item="remove"]',row).addEventListener('click',()=>{row.remove();if(!$('#items').children.length)addItemRow();updateTotals()});$('#items').append(row);updateStockNote(row);updateTotals()}
function updateStockNote(row){const productId=$('[data-item="product"]',row).value;const size=$('[data-item="size"]',row).value;const qty=Math.max(1,Number($('[data-item="qty"]',row).value)||1);const note=$('[data-item="stock"]',row);if(!productId){note.textContent='';note.classList.remove('low');return}const current=Number(stockFor(productId)[size])||0;const reserved=state.editing?(state.editing.items||[]).filter(i=>String(i.productId)===String(productId)&&i.talla===size).reduce((sum,i)=>sum+(Number(i.cantidad)||0),0):0;const available=current+reserved;note.textContent=`Disponible: ${available}`;note.classList.toggle('low',qty>available)}
function updateTotals(){
  const subtotal=$$('.item-row',$('#items')).reduce((sum,row)=>sum+(Number($('[data-item="qty"]',row).value)||0)*(Number($('[data-item="price"]',row).value)||0),0);
  const shipping=Number($('#saleShipping').value)||0;
  const total=subtotal+shipping;
  const delivery=$('#saleDelivery').value;
  const moneyState=$('#saleMoney').value;
  const isC807=isC807Delivery(delivery);
  const commission=editorC807Commission(total,delivery,moneyState);
  $('#saleSubtotal').textContent=money(subtotal);
  $('#saleShippingTotal').textContent=money(shipping);
  $('#saleTotal').textContent=money(total);
  const guideWrap=$('#saleC807GuideWrap');
  const commissionWrap=$('#saleC807CommissionWrap');
  if(guideWrap)guideWrap.hidden=!isC807;
  if(commissionWrap)commissionWrap.hidden=!isC807;
  const guideValue=$('#saleC807Guide');
  const commissionValue=$('#saleC807Commission');
  if(guideValue)guideValue.textContent=money(c807GuideCost(delivery));
  if(commissionValue)commissionValue.textContent=money(commission);
}

function resetForm(){$('#saleForm').reset();$('#items').replaceChildren();$('#saleShipping').value='0';state.editing=null;state.previousWeekStart='';$('#deleteSale').hidden=true;$('#saleDialogTitle').textContent='Nueva venta';updateTotals()}
function showEditor(){const editor=$('#saleEditor');editor.hidden=false;requestAnimationFrame(()=>editor.scrollIntoView({behavior:'smooth',block:'start'}))}
function hideEditor(){const editor=$('#saleEditor');editor.hidden=true;state.editing=null;state.previousWeekStart=''}
function openNewSale(date=addDays(state.weekStart,0)){resetForm();$('#salePickupDate').value=date;addItemRow();showEditor()}
function openEditSale(sale){resetForm();state.editing=sale;state.previousWeekStart=mondayOf(sale.fecha);$('#saleDialogTitle').textContent='Editar venta';$('#deleteSale').hidden=false;$('#salePickupDate').value=sale.fechaRetiro||sale.fecha||'';$('#saleChannel').value=sale.canal||'Instagram';$('#saleClient').value=sale.cliente||'';$('#salePlace').value=sale.lugarHorario||'';$('#saleShipping').value=Number(sale.envio)||0;$('#saleDelivery').value=sale.entrega||'Pedido Express';$('#saleState').value=sale.estado||'Pendiente';$('#saleShippingStage').value=sale.etapaEnvio||'Pedido tomado';$('#saleMoney').value=sale.dinero||'Pendiente';(sale.items||[]).forEach(addItemRow);if(!sale.items?.length)addItemRow();updateTotals();showEditor()}
function formSale(){const pickupDate=$('#salePickupDate').value;const items=$$('.item-row',$('#items')).map(row=>{const product=state.products.find(p=>String(p.id)===$('[data-item="product"]',row).value);return{productId:product?.id,codigo:product?.codigo,nombre:product?.nombre,talla:$('[data-item="size"]',row).value,cantidad:Number($('[data-item="qty"]',row).value)||1,precio:Number($('[data-item="price"]',row).value)||0}});return{id:state.editing?.id,fecha:pickupDate,fechaRetiro:pickupDate,canal:$('#saleChannel').value,cliente:$('#saleClient').value,lugarHorario:$('#salePlace').value,items,envio:Number($('#saleShipping').value)||0,entrega:$('#saleDelivery').value,estado:$('#saleState').value,etapaEnvio:$('#saleShippingStage').value,dinero:$('#saleMoney').value,notas:''}}
async function saveSale(){const button=$('#saveSale');button.disabled=true;const wasEditing=!!state.editing;try{const sale=formSale();if(!sale.fecha)throw new Error('Selecciona el día que retiró el cliente.');if(!sale.cliente.trim())throw new Error('Escribe el nombre del cliente.');const options=wasEditing?{method:'PUT',body:JSON.stringify({sale,previousWeekStart:state.previousWeekStart})}:{method:'POST',body:JSON.stringify({sale})};const data=await api('sales',options);hideEditor();state.weekStart=data.weekStart||state.weekStart;await loadWeek();toast(wasEditing?'Venta actualizada':'Venta guardada')}catch(err){toast(err.message,true)}finally{button.disabled=false}}
async function deleteSale(){if(!state.editing||!confirm(`¿Archivar la venta de ${state.editing.cliente||'este cliente'}? Desaparecerá de las ventas activas y el stock reservado se devolverá, pero la venta seguirá guardada.`))return;const button=$('#deleteSale');button.disabled=true;try{await api('sales',{method:'DELETE',body:JSON.stringify({id:state.editing.id,weekStart:state.previousWeekStart})});hideEditor();await loadWeek();toast('Venta archivada. El registro se conservó y el stock fue devuelto.')}catch(err){toast(err.message,true)}finally{button.disabled=false}}

function formatAuditTime(value){if(!value)return'';const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleString('es-SV',{dateStyle:'medium',timeStyle:'short'})}
async function loadSaleHistory(saleId,container){if(!container||container.dataset.loaded==='true')return;container.dataset.loaded='true';container.textContent='Cargando historial…';try{const data=await api(`sales?mode=history&id=${encodeURIComponent(saleId)}`,{method:'GET'});const labels={baseline:'Registro protegido',created:'Venta creada',updated:'Venta editada',archived:'Venta archivada',restored:'Venta restaurada',deleted:'Eliminación detectada'};container.replaceChildren();const rows=data.history||[];if(!rows.length){container.textContent='Sin cambios registrados.';return}rows.forEach(entry=>{const line=document.createElement('p');line.style.margin='8px 0';const strong=document.createElement('strong');strong.textContent=labels[entry.action]||entry.action;const small=document.createElement('small');small.style.display='block';small.textContent=formatAuditTime(entry.changed_at);line.append(strong,small);container.append(line)})}catch(err){container.dataset.loaded='';container.textContent=err.message||'No se pudo cargar el historial.'}}
function renderArchivedSales(){const wrap=$('#archivedSalesList');if(!wrap)return;wrap.replaceChildren();if(!state.archived.length){const empty=document.createElement('div');empty.className='empty-day';empty.textContent='No hay ventas archivadas.';wrap.append(empty);return}state.archived.forEach(sale=>{const card=document.createElement('article');card.className='haki-sale-mini archived-sale-card';const items=(sale.items||[]).map(i=>`${i.codigo} ${i.talla}${Number(i.cantidad)>1?` ×${i.cantidad}`:''}`).join(' · ')||'Pedido';card.innerHTML=`<div class="sale-main-copy"><div class="sale-client-line"><strong>${escapeHtml(sale.cliente||'Cliente')}</strong><span> - ${escapeHtml(items)}</span>${channelBadge(sale.canal)}</div><small class="sale-destination">${escapeHtml(sale.lugarHorario||'Sin destino')}</small></div><div class="amount">${money(sale.total)}</div><div class="meta"><span class="pill cancelled">Archivada</span><span class="pill">${escapeHtml(formatAuditTime(sale.archivedAt)||'')}</span></div>`;const actions=document.createElement('div');actions.className='archived-sale-actions';const restore=document.createElement('button');restore.type='button';restore.className='button primary';restore.textContent='Restaurar venta';restore.addEventListener('click',async()=>{if(!confirm(`¿Restaurar la venta de ${sale.cliente||'este cliente'}? El sistema volverá a reservar el inventario.`))return;restore.disabled=true;try{await api('sales?mode=restore',{method:'POST',body:JSON.stringify({id:sale.id})});await loadArchivedSales();await loadWeek();toast('Venta restaurada y stock reservado nuevamente.')}catch(err){toast(err.message,true)}finally{restore.disabled=false}});const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Historial';summary.style.cursor='pointer';const history=document.createElement('div');history.style.padding='8px 0';details.append(summary,history);details.addEventListener('toggle',()=>{if(details.open)loadSaleHistory(sale.id,history)});const permanentDelete=document.createElement('button');permanentDelete.type='button';permanentDelete.className='button danger';permanentDelete.textContent='Borrar definitivamente';permanentDelete.addEventListener('click',async()=>{if(!confirm(`¿Borrar definitivamente la venta de ${sale.cliente||'este cliente'}? Esta acción no se puede deshacer y eliminará también su historial.`))return;if(!confirm('Última confirmación: la venta se eliminará de forma permanente. ¿Continuar?'))return;restore.disabled=true;permanentDelete.disabled=true;try{await api('sales?mode=permanent-delete',{method:'DELETE',body:JSON.stringify({id:sale.id,archivedAt:sale.archivedAt,confirmDelete:true})});await loadArchivedSales();toast('Venta borrada definitivamente.')}catch(err){toast(err.message,true);restore.disabled=false;permanentDelete.disabled=false}});actions.append(restore,permanentDelete,details);card.append(actions);wrap.append(card)})}
async function loadArchivedSales(){const data=await api('sales?mode=archived',{method:'GET'});state.archived=data.archived||[];renderArchivedSales()}


$$('.tab').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));
$('#prevWeek').addEventListener('click',async()=>{state.weekStart=addDays(state.weekStart,-7);hideEditor();await loadWeek()});
$('#nextWeek').addEventListener('click',async()=>{state.weekStart=addDays(state.weekStart,7);hideEditor();await loadWeek()});
$('#todayWeek').addEventListener('click',async()=>{state.weekStart=mondayOf(new Date());hideEditor();await loadWeek()});
$('#newSale').addEventListener('click',()=>{switchTab('sales');const today=isoDate(new Date());openNewSale(mondayOf(today)===state.weekStart?today:state.weekStart)});
$('#backFromArchived').addEventListener('click',()=>switchTab('sales'));
$('#inventorySearch').addEventListener('input',renderInventory);
$('#addItem').addEventListener('click',()=>addItemRow());
$('#saleShipping').addEventListener('input',updateTotals);
$('#saleDelivery').addEventListener('change',updateTotals);
$('#saleMoney').addEventListener('change',updateTotals);
$('#closeDialog').addEventListener('click',hideEditor);
$('#cancelDialog').addEventListener('click',hideEditor);
$('#deleteSale').addEventListener('click',deleteSale);
$('#saleForm').addEventListener('submit',event=>{event.preventDefault();saveSale()});

function finishAdminLoading(){const loader=$('#hakiAdminLoader');if(!loader)return;requestAnimationFrame(()=>{loader.classList.add('is-hidden');setTimeout(()=>loader.remove(),360)})}
(async()=>{state.weekStart=mondayOf(new Date());try{if(!await ensureAuth())return;await Promise.all([loadProducts(),loadWeek()])}catch(err){toast(err.message || 'No se pudo conectar con HAKI. Recarga para intentarlo de nuevo.',true)}finally{finishAdminLoading()}})();
