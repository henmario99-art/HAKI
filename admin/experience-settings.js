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
  Object.entries(groups).forEach(([title,fields])=>{
    const details=document.createElement('details');details.open=title==='Apariencia';const summary=document.createElement('summary');summary.textContent=title;details.append(summary);
    const grid=document.createElement('div');grid.className='grid config-grid';
    fields.forEach(([key,text,type])=>{
      const label=document.createElement('label');label.textContent=text;
      const input=document.createElement(type==='textarea'?'textarea':type?.includes('|')?'select':'input');input.dataset.config=key;
      if(type?.includes('|'))type.split('|').forEach(value=>{const o=document.createElement('option');o.value=value;o.textContent=value==='true'?'Sí, por prenda':value==='false'?'No, por pedido':value.charAt(0).toUpperCase()+value.slice(1);input.append(o);});
      if(type==='number'){input.type='number';input.min=key==='envioMeta'?'0.01':'0';input.step='0.01';}
      if(type==='textarea'){input.rows=3;label.className='wide';}
      label.append(input);grid.append(label);
    });details.append(grid);card.append(details);
  });
  const note=document.createElement('p');note.textContent='Horizon necesita su archivo para uso web. Hasta cargarlo se muestra Poppins. Los anuncios cambian cada 5 segundos. El botón derecho de la portada se configura en la sección GYMRAT TEST.';card.append(note);
  document.querySelector('#adminView .config-card').after(card);
})();
