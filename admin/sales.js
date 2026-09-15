const $=(s,e=document)=>e.querySelector(s);
const $$=(s,e=document)=>[...e.querySelectorAll(s)];
const API='/.netlify/functions';
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)||0);
const weekdays=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const state={products:[],inventory:{},sales:[],weekStart:'',editing:null,previousWeekStart:''};

async function api(path,options={}){const res=await fetch(`${API}/${path}`,{credentials:'same-origin',headers:{'content-type':'application/json',...(options.headers||{})},...options});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||`Error ${res.status}`);return data}
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

async function ensureAuth(){try{const auth=await api('auth',{method:'GET'});if(!auth.authenticated)location.href='/admin/'}catch{location.href='/admin/'}}
async function loadProducts(){const data=await api('catalog',{method:'GET'});state.products=data.products||[]}
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
    const table=document.createElement('table');table.className='sale-table';table.innerHTML='<thead><tr><th>Canal</th><th>Cliente</th><th>Pedido</th><th>Total</th><th>Entrega</th><th>Estado</th><th>Dinero</th></tr></thead>';
    const body=document.createElement('tbody');
    sales.forEach(sale=>{const tr=document.createElement('tr');tr.dataset.sale=sale.id;const items=(sale.items||[]).map(i=>`${i.codigo} ${i.talla}${Number(i.cantidad)>1?` ×${i.cantidad}`:''}`);tr.innerHTML=`<td data-label="Canal"><span class="badge ${badgeClass(sale.canal)}">${escapeHtml(sale.canal)}</span></td><td data-label="Cliente">${escapeHtml(sale.cliente||'—')}</td><td data-label="Pedido" class="order-summary"><strong>${escapeHtml(items.slice(0,2).join(' · ')||'—')}</strong>${items.length>2?`<small>+${items.length-2} más</small>`:''}</td><td data-label="Total"><strong>${money(sale.total)}</strong></td><td data-label="Entrega">${escapeHtml(sale.entrega||'—')}</td><td data-label="Estado"><span class="badge ${stateClass(sale.estado)}">${escapeHtml(sale.estado)}</span></td><td data-label="Dinero"><span class="badge ${moneyClass(sale.dinero)}">${escapeHtml(sale.dinero)}</span></td>`;tr.addEventListener('click',()=>openEditSale(sale));body.append(tr)});
    table.append(body);section.append(table);days.append(section)
  }
}

function switchTab(name){$$('.tab').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.tab===name));$('#salesView').hidden=name!=='sales';$('#inventoryView').hidden=name!=='inventory';if(name==='inventory')renderInventory()}
function renderInventory(){if(!state.products.length)return;const q=($('#inventorySearch').value||'').trim().toLowerCase();const wrap=$('#inventoryList');wrap.replaceChildren();state.products.filter(p=>!q||`${p.codigo} ${p.nombre}`.toLowerCase().includes(q)).forEach(product=>{const stock=stockFor(product.id);const row=document.createElement('article');row.className='inventory-row';const productInfo=document.createElement('div');productInfo.className='inventory-product';productInfo.innerHTML=`<strong>${escapeHtml(product.nombre)}</strong><small>${escapeHtml(product.codigo)}</small>`;row.append(productInfo);['S','M','L','XL'].forEach(size=>{const label=document.createElement('label');label.innerHTML=`<span>${size}</span><input type="number" min="0" step="1" value="${Number(stock[size])||0}" data-stock="${size}">`;row.append(label)});const total=document.createElement('div');total.className='inventory-total';total.textContent=String(['S','M','L','XL'].reduce((a,s)=>a+(Number(stock[s])||0),0));row.append(total);const save=document.createElement('button');save.type='button';save.className='button secondary';save.textContent='Guardar';save.addEventListener('click',async()=>{save.disabled=true;try{const next={};$$('[data-stock]',row).forEach(input=>next[input.dataset.stock]=Math.max(0,Math.trunc(Number(input.value)||0)));const data=await api('sales?mode=inventory',{method:'PUT',body:JSON.stringify({productId:product.id,stock:next})});state.inventory=data.inventory||state.inventory;total.textContent=String(Object.values(next).reduce((a,b)=>a+b,0));toast('Inventario guardado')}catch(err){toast(err.message,true)}finally{save.disabled=false}});$$('[data-stock]',row).forEach(input=>input.addEventListener('input',()=>{total.textContent=String($$('[data-stock]',row).reduce((sum,el)=>sum+Math.max(0,Math.trunc(Number(el.value)||0)),0))}));wrap.append(row)})}

function productOptions(selectedId=''){return state.products.map(p=>`<option value="${p.id}" ${String(p.id)===String(selectedId)?'selected':''}>${escapeHtml(p.codigo)} — ${escapeHtml(p.nombre)}</option>`).join('')}
function addItemRow(item={}){const tpl=$('#itemTemplate').content.cloneNode(true);const row=$('.item-row',tpl);const product=$('[data-item="product"]',row);product.innerHTML='<option value="">Selecciona una prenda</option>'+productOptions(item.productId);const size=$('[data-item="size"]',row);size.value=item.talla||'S';const qty=$('[data-item="qty"]',row);qty.value=item.cantidad||1;const price=$('[data-item="price"]',row);price.value=item.precio??'';const updateProduct=()=>{const p=state.products.find(x=>String(x.id)===product.value);if(p)price.value=Number(p.precio||0).toFixed(2);updateStockNote(row);updateTotals()};product.addEventListener('change',updateProduct);size.addEventListener('change',()=>updateStockNote(row));qty.addEventListener('input',()=>{updateStockNote(row);updateTotals()});price.addEventListener('input',updateTotals);$('[data-item="remove"]',row).addEventListener('click',()=>{row.remove();if(!$('#items').children.length)addItemRow();updateTotals()});$('#items').append(row);updateStockNote(row);updateTotals()}
function updateStockNote(row){const productId=$('[data-item="product"]',row).value;const size=$('[data-item="size"]',row).value;const qty=Math.max(1,Number($('[data-item="qty"]',row).value)||1);const note=$('[data-item="stock"]',row);if(!productId){note.textContent='';note.classList.remove('low');return}const current=Number(stockFor(productId)[size])||0;const reserved=state.editing?(state.editing.items||[]).filter(i=>String(i.productId)===String(productId)&&i.talla===size).reduce((sum,i)=>sum+(Number(i.cantidad)||0),0):0;const available=current+reserved;note.textContent=`Disponible: ${available}`;note.classList.toggle('low',qty>available)}
function updateTotals(){const subtotal=$$('.item-row',$('#items')).reduce((sum,row)=>sum+(Number($('[data-item="qty"]',row).value)||0)*(Number($('[data-item="price"]',row).value)||0),0);const shipping=Number($('#saleShipping').value)||0;$('#saleSubtotal').textContent=money(subtotal);$('#saleShippingTotal').textContent=money(shipping);$('#saleTotal').textContent=money(subtotal+shipping)}

function resetForm(){$('#saleForm').reset();$('#items').replaceChildren();$('#saleShipping').value='0';state.editing=null;state.previousWeekStart='';$('#deleteSale').hidden=true;$('#saleDialogTitle').textContent='Nueva venta';updateTotals()}
function showEditor(){const editor=$('#saleEditor');editor.hidden=false;requestAnimationFrame(()=>editor.scrollIntoView({behavior:'smooth',block:'start'}))}
function hideEditor(){const editor=$('#saleEditor');editor.hidden=true;state.editing=null;state.previousWeekStart=''}
function openNewSale(date=addDays(state.weekStart,0)){resetForm();$('#salePickupDate').value=date;addItemRow();showEditor()}
function openEditSale(sale){resetForm();state.editing=sale;state.previousWeekStart=mondayOf(sale.fecha);$('#saleDialogTitle').textContent='Editar venta';$('#deleteSale').hidden=false;$('#salePickupDate').value=sale.fechaRetiro||sale.fecha||'';$('#saleChannel').value=sale.canal||'Instagram';$('#saleClient').value=sale.cliente||'';$('#salePlace').value=sale.lugarHorario||'';$('#saleShipping').value=Number(sale.envio)||0;$('#saleDelivery').value=sale.entrega||'Pedido Express';$('#saleState').value=sale.estado||'Pendiente';$('#saleMoney').value=sale.dinero||'Pendiente';(sale.items||[]).forEach(addItemRow);if(!sale.items?.length)addItemRow();updateTotals();showEditor()}
function formSale(){const pickupDate=$('#salePickupDate').value;const items=$$('.item-row',$('#items')).map(row=>{const product=state.products.find(p=>String(p.id)===$('[data-item="product"]',row).value);return{productId:product?.id,codigo:product?.codigo,nombre:product?.nombre,talla:$('[data-item="size"]',row).value,cantidad:Number($('[data-item="qty"]',row).value)||1,precio:Number($('[data-item="price"]',row).value)||0}});return{id:state.editing?.id,fecha:pickupDate,fechaRetiro:pickupDate,canal:$('#saleChannel').value,cliente:$('#saleClient').value,lugarHorario:$('#salePlace').value,items,envio:Number($('#saleShipping').value)||0,entrega:$('#saleDelivery').value,estado:$('#saleState').value,dinero:$('#saleMoney').value,notas:''}}
async function saveSale(){const button=$('#saveSale');button.disabled=true;const wasEditing=!!state.editing;try{const sale=formSale();if(!sale.fecha)throw new Error('Selecciona el día que retiró el cliente.');if(!sale.cliente.trim())throw new Error('Escribe el nombre del cliente.');const options=wasEditing?{method:'PUT',body:JSON.stringify({sale,previousWeekStart:state.previousWeekStart})}:{method:'POST',body:JSON.stringify({sale})};const data=await api('sales',options);hideEditor();state.weekStart=data.weekStart||state.weekStart;await loadWeek();toast(wasEditing?'Venta actualizada':'Venta guardada')}catch(err){toast(err.message,true)}finally{button.disabled=false}}
async function deleteSale(){if(!state.editing||!confirm(`¿Eliminar la venta de ${state.editing.cliente||'este cliente'}? El stock reservado se devolverá.`))return;const button=$('#deleteSale');button.disabled=true;try{await api('sales',{method:'DELETE',body:JSON.stringify({id:state.editing.id,weekStart:state.previousWeekStart})});hideEditor();await loadWeek();toast('Venta eliminada')}catch(err){toast(err.message,true)}finally{button.disabled=false}}

$$('.tab').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));
$('#prevWeek').addEventListener('click',async()=>{state.weekStart=addDays(state.weekStart,-7);hideEditor();await loadWeek()});
$('#nextWeek').addEventListener('click',async()=>{state.weekStart=addDays(state.weekStart,7);hideEditor();await loadWeek()});
$('#todayWeek').addEventListener('click',async()=>{state.weekStart=mondayOf(new Date());hideEditor();await loadWeek()});
$('#newSale').addEventListener('click',()=>{const today=isoDate(new Date());openNewSale(mondayOf(today)===state.weekStart?today:state.weekStart)});
$('#inventorySearch').addEventListener('input',renderInventory);
$('#addItem').addEventListener('click',()=>addItemRow());
$('#saleShipping').addEventListener('input',updateTotals);
$('#closeDialog').addEventListener('click',hideEditor);
$('#cancelDialog').addEventListener('click',hideEditor);
$('#deleteSale').addEventListener('click',deleteSale);
$('#saleForm').addEventListener('submit',event=>{event.preventDefault();saveSale()});

(async()=>{await ensureAuth();state.weekStart=mondayOf(new Date());try{await loadProducts();await loadWeek()}catch(err){toast(err.message,true)}})();
