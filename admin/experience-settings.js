(() => {
  const card=document.createElement('section');card.className='config-card';card.id='experienceSettings';
  card.innerHTML='<h2>Apariencia, portada y carrito</h2><p>Estos ajustes se reflejan en el catálogo al guardar.</p>';
  const groups={
    'Apariencia':[['tema','Modo del catálogo','claro|oscuro'],['fuenteTitulos','Fuente general de títulos','Horizon|Poppins'],['fuenteTexto','Fuente general de subtítulos y textos','Poppins|Horizon'],['horizonUrl','Archivo web de Horizon (URL WOFF2, WOFF o TTF)']],
    'Anuncios y portada':[['anuncio2','Segundo anuncio'],['anuncio3','Tercer anuncio'],['botonPortada','Texto del primer botón'],['enlacePortada','Destino del primer botón'],['estiloBotonPortada','Estilo del primer botón','blanco|transparente'],['estiloBotonPortada2','Estilo del segundo botón (GYMRAT TEST)','transparente|blanco'],['buscarTexto','Mensaje del buscador']],
    'Envío':[['envioMeta','Envío gratis desde ($)','number'],['envioCosto','Costo estimado de envío ($)','number'],['envioPorPrenda','Aplicar costo por prenda','true|false'],['envioFalta','Mensaje de progreso (usa {monto})'],['envioListo','Mensaje al alcanzar envío gratis'],['envioInformacion','Información del icono de envío','textarea']],
    'Carrito y sugerencias':[['carritoTitulo','Título del carrito'],['carritoAntetitulo','Texto superior'],['carritoVacio','Carrito vacío'],['carritoAyudaVacio','Ayuda con carrito vacío'],['carritoAviso','Aviso de disponibilidad','textarea'],['sugerenciasTitulo','Título de sugerencias'],['sugerenciasTexto','Descripción de sugerencias'],['sugerenciasAgregar','Botón añadir sugerencia'],['sugerenciasTalla','Selector de talla'],['eliminarTexto','Botón eliminar']],
    'Resumen y cotización':[['resumenTitulo','Título del resumen'],['subtotalTexto','Etiqueta subtotal'],['envioTexto','Etiqueta envío estimado'],['totalTexto','Etiqueta total estimado'],['gratisTexto','Etiqueta envío gratis'],['datosTitulo','Título de datos'],['nombreTexto','Etiqueta nombre'],['nombrePlaceholder','Ejemplo de nombre'],['departamentoTexto','Etiqueta departamento'],['departamentoPlaceholder','Ejemplo de departamento'],['municipioTexto','Etiqueta municipio'],['municipioPlaceholder','Ejemplo de municipio'],['whatsappTexto','Botón WhatsApp'],['instagramTexto','Botón Instagram'],['carritoAyuda','Nota inferior del carrito','textarea'],['saludoCotizacion','Inicio del mensaje de cotización','textarea']]
  };
  Object.entries(groups).forEach(([title,fields])=>{const details=document.createElement('details');details.open=title==='Apariencia';const summary=document.createElement('summary');summary.textContent=title;details.append(summary);const grid=document.createElement('div');grid.className='grid config-grid';fields.forEach(([key,text,type])=>{const label=document.createElement('label');label.textContent=text;const input=document.createElement(type==='textarea'?'textarea':type?.includes('|')?'select':'input');input.dataset.config=key;if(type?.includes('|'))type.split('|').forEach(value=>{const o=document.createElement('option');o.value=value;o.textContent=value==='true'?'Sí, por prenda':value==='false'?'No, por pedido':value.charAt(0).toUpperCase()+value.slice(1);input.append(o)});if(type==='number'){input.type='number';input.min=key==='envioMeta'?'0.01':'0';input.step='0.01'}if(type==='textarea'){input.rows=3;label.className='wide'}label.append(input);grid.append(label)});details.append(grid);card.append(details)});
  const note=document.createElement('p');note.textContent='Horizon necesita su archivo para uso web. Hasta cargarlo se muestra Poppins. Los anuncios cambian cada 5 segundos. El botón derecho de la portada se configura en la sección GYMRAT TEST.';card.append(note);document.querySelector('#adminView .config-card').after(card);
})();
(() => {
  const STYLE_ID='haki-admin-compact-extras';function addStyles(){if(document.getElementById(STYLE_ID))return;const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`.product-compact-details .compact-extra-options{padding:0 16px 16px}.product-compact-details .compact-extra-options .product-placement{margin-top:0}.product-compact-details .compact-extra-options .product-color-setting{margin-top:16px}@media(max-width:700px){.product-compact-details .compact-extra-options{padding:0 14px 14px}}`;document.head.append(style)}
  function replacePinkAndAddGreen(root){if(!root?.querySelector)return;const pink=root.querySelector('.color-swatch[data-color="Rosa"],.color-swatch[data-color="Rosado"]');if(pink){pink.dataset.color='Morado';pink.title='Morado';pink.style.setProperty('--swatch','#8153a6');pink.style.setProperty('--swatch-border','#684287');const input=pink.querySelector('input[data-color]');if(input){input.dataset.color='Morado';input.setAttribute('aria-label','Morado')}}const colors=root.querySelector('.color-swatches');if(colors&&!colors.querySelector('.color-swatch[data-color="Verde"]')){const green=document.createElement('label');green.className='color-swatch';green.dataset.color='Verde';green.title='Verde';green.style.setProperty('--swatch','#3f7f4b');green.style.setProperty('--swatch-border','#32663c');green.innerHTML='<input type="checkbox" data-color="Verde" aria-label="Verde">';colors.append(green)}}
  function groupProductOptions(root){if(!root?.querySelector)return;replacePinkAndAddGreen(root);const details=root.querySelector('.product-compact-details');if(!details)return;let extras=details.querySelector('.compact-extra-options');if(!extras){extras=document.createElement('div');extras.className='compact-extra-options';details.append(extras)}const placement=root.querySelector('.product-placement');const colors=root.querySelector('.product-color-setting');if(placement&&placement.parentElement!==extras)extras.append(placement);if(colors&&colors.parentElement!==extras)extras.append(colors)}
  function migrateLegacyPink(){try{if(typeof state==='undefined'||!Array.isArray(state.products))return;let changed=false;state.products.forEach(product=>{if(!product)return;if(Array.isArray(product.colores)){const next=[...new Set(product.colores.map(color=>{const value=String(color||'').trim();if(/^rosa(?:do)?$/i.test(value)){changed=true;return 'Morado'}return value}).filter(Boolean))];if(next.length!==product.colores.length||next.some((value,index)=>value!==product.colores[index]))product.colores=next}});if(changed&&typeof renderProducts==='function')renderProducts()}catch{}}
  addStyles();replacePinkAndAddGreen(document.querySelector('#productTemplate')?.content);const apply=()=>{groupProductOptions(document.querySelector('#productTemplate')?.content);document.querySelectorAll('#products .product-card').forEach(groupProductOptions);migrateLegacyPink()};setTimeout(apply,0);setInterval(apply,400);
})();
(() => {
  let inventory = null;
  let loading = false;
  let reportSignature = '';
  const sizes = ['S', 'M', 'L', 'XL'];
  const count = value => Math.max(0, Math.trunc(Number(value) || 0));
  const style = document.createElement('style');
  style.textContent = `.private-inventory{margin-top:16px;padding:14px;border:1px solid #ddd;border-radius:14px;background:#fafaf8}.private-inventory-head{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin-bottom:10px}.private-inventory-head span{font-size:11px;color:#666}.private-stock-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.private-stock-grid label{font-size:12px}.private-stock-grid input{text-align:center;min-width:0;font-size:16px}.private-inventory-footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;margin-top:10px;font-size:12px}.inventory-zero-notice{border:1px solid #e5bc6b;background:#fff6df;color:#573800;border-radius:12px;padding:12px;margin:12px 0;font-size:13px}.private-stock-note{font-size:11px;color:#666;margin:8px 0 0}`;
  document.head.append(style);

  function syncSizes(product, stock, card) {
    product.tallas ||= {};
    for (const size of sizes) {
      if (!Object.hasOwn(stock, size)) continue;
      product.tallas[size] = count(stock[size]) > 0;
      const checkbox = card?.querySelector(`[data-size="${size}"]`);
      if (checkbox) { checkbox.checked = product.tallas[size]; checkbox.disabled = true; checkbox.title = 'La disponibilidad se actualiza con el inventario'; }
    }
  }
  function zeroReport() {
    let note = document.getElementById('inventoryZeroNotice');
    if (!note) { note = document.createElement('div'); note.id = 'inventoryZeroNotice'; note.className = 'inventory-zero-notice'; document.querySelector('#products')?.before(note); }
    const tracked = (state.products || []).filter(p => Object.hasOwn(inventory || {}, String(p.id)));
    const zeros = tracked.filter(p => sizes.every(size => count(inventory[String(p.id)][size]) === 0));
    const partial = tracked.filter(p => sizes.some(size => count(inventory[String(p.id)][size]) === 0) && !zeros.includes(p));
    const signature = JSON.stringify([zeros.map(p=>[p.codigo,p.nombre]),partial.map(p=>[p.codigo,p.nombre,inventory[String(p.id)]])]);
    if (signature === reportSignature) return;
    reportSignature = signature;
    note.hidden = !zeros.length && !partial.length;
    note.replaceChildren();
    if (zeros.length) { const line = document.createElement('p'); line.textContent = `Sin existencias: ${zeros.map(p => `${p.nombre} (${p.codigo})`).join(' · ')}`; note.append(line); }
    if (partial.length) { const detail = document.createElement('details'); const title = document.createElement('summary'); title.textContent = `${partial.length} prendas actualizadas tienen alguna talla en 0`; detail.append(title); for (const p of partial) { const line = document.createElement('p'); line.textContent = `${p.nombre} (${p.codigo}): ${sizes.filter(size => count(inventory[String(p.id)][size]) === 0).join(', ')}`; detail.append(line); } note.append(detail); }
  }
  function enhanceCards() {
    if (!inventory) return;
    document.querySelectorAll('#products .product-card').forEach(card => {
      if (card.querySelector('.private-inventory')) return;
      const code = card.querySelector('[data-field="codigo"]')?.value;
      const product = state.products.find(p => p.codigo === code);
      if (!product) return;
      const stock = inventory[String(product.id)];
      if (stock) syncSizes(product, stock, card);
      const section = document.createElement('section'); section.className = 'private-inventory'; section.dataset.productId = product.id;
      section.innerHTML = `<div class="private-inventory-head"><strong>Inventario privado</strong><span>Solo administrador</span></div><div class="private-stock-grid">${sizes.map(size => `<label>${size}<input type="number" min="0" step="1" value="${count(stock?.[size])}" data-private-size="${size}"></label>`).join('')}</div><div class="private-inventory-footer"><span class="private-stock-total"></span><button type="button" class="ghost private-save-stock">Guardar inventario</button></div><p class="private-stock-note">La disponibilidad de cada talla sigue las cantidades guardadas.</p>`;
      const values = () => Object.fromEntries([...section.querySelectorAll('[data-private-size]')].map(input => [input.dataset.privateSize, count(input.value)]));
      const total = () => { section.querySelector('.private-stock-total').textContent = `Total: ${Object.values(values()).reduce((a,b) => a+b,0)} unidades`; };
      section.addEventListener('input', () => { total(); section.dataset.dirty = 'true'; syncSizes(product, values(), card); }); total();
      section.querySelector('button').addEventListener('click', async event => {
        const button = event.currentTarget; button.disabled = true;
        try { const data = await api('sales?mode=inventory', { method:'PUT', body:JSON.stringify({productId:product.id,stock:values()}) }); inventory = data.inventory; delete section.dataset.dirty; syncSizes(product, inventory[String(product.id)], card); zeroReport(); toast('Inventario y disponibilidad guardados', true); }
        catch(error) { toast(error.message); }
        finally { button.disabled = false; }
      });
      const sizesNode = card.querySelector('.sizes'); if (sizesNode) sizesNode.after(section); else card.append(section);
    });
    zeroReport();
  }
  // Never initialize persisted inventory from missing, delayed, or failed reads.
  async function loadInventory() {
    if (loading || inventory) return;
    loading = true;
    try { const data = await api('sales?mode=inventory', {method:'GET'}); inventory = data.inventory || {}; enhanceCards(); }
    catch(error) { console.warn('No se pudo cargar inventario privado', error); }
    finally { loading = false; }
  }
  setInterval(() => {
    const admin = document.querySelector('#adminView'); if (!admin || admin.hidden) return;
    const actions = document.querySelector('.top-actions');
    if (actions && !actions.querySelector('.admin-sales-link')) { const link = document.createElement('a'); link.className='ghost admin-sales-link'; link.href='/admin/sales.html'; link.textContent='Ventas'; actions.prepend(link); }
    if (!inventory) loadInventory(); else enhanceCards();
  }, 400);
})();
