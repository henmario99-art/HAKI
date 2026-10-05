(() => {
  const config = window.HAKI_LEGAL || {};
  const links = [['Términos y condiciones','terminos.html'],['Privacidad','privacidad.html'],['Cookies y almacenamiento','cookies.html'],['Envíos','envios.html'],['Cambios y devoluciones','cambios-devoluciones.html'],['Contacto y reclamos','reclamaciones.html']];
  const relative = location.pathname.startsWith('/app/') ? '../' : './';
  function navigation() {
    const nav = document.createElement('nav'); nav.className = 'haki-legal-links'; nav.setAttribute('aria-label','Políticas de HAKI');
    for (const [label, path] of links) { const a = document.createElement('a'); a.href = relative + path; a.textContent = label; nav.append(a); }
    return nav;
  }
  function init() {
    document.querySelectorAll('[data-legal="version"]').forEach(node => { node.textContent = config.version || '2026-10-05.3'; });
    const footer = document.querySelector('footer.footer, footer.info-footer, footer.legal-footer');
    if (footer && !footer.querySelector('.haki-legal-links')) footer.append(navigation());
    const form = document.getElementById('quoteForm');
    if(form && !document.getElementById('quoteDataConsent')) {
      const block = document.createElement('div'); block.className = 'quote-policy-note';
      const intro = document.createElement('p'); intro.textContent = 'Esta solicitud es una cotización. Antes de comprar, confirmaremos por escrito las prendas, el costo total y el plazo de entrega. Entregas en El Salvador.'; block.append(intro);
      const choices = [['quoteTermsRead','He leído los términos y las condiciones de cambios y devoluciones.','terminos.html','Ver condiciones'],['quoteDataConsent','Autorizo el uso de mi nombre y ubicación para atender esta solicitud y su transferencia a WhatsApp o Instagram al elegir ese canal. Esta autorización no incluye publicidad.','privacidad.html','Ver privacidad']];
      for(const [id, text, path, label] of choices) { const row = document.createElement('label'); row.className = 'quote-authorization'; const input = document.createElement('input'); input.id = id; input.type = 'checkbox'; input.required = true; const span = document.createElement('span'); span.append(document.createTextNode(text + ' ')); const a = document.createElement('a'); a.href = relative + path; a.target = '_blank'; a.rel = 'noopener'; a.textContent = label; span.append(a); row.append(input,span); block.append(row); }
      form.querySelector('.quote-actions')?.before(block);
    }
    document.querySelector('[data-clear-browser]')?.addEventListener('click', () => {
      const keys = ['haki_cart_v1','haki_theme_v1','haki_catalog_cache_v4','haki_online_catalog_definitivo_v1','haki_cover_config_v1'];
      try { keys.forEach(key => localStorage.removeItem(key)); document.querySelector('[data-clear-result]').textContent = 'Se borraron la bolsa y estas preferencias locales. Los registros de compras y los mensajes se gestionan mediante una solicitud de privacidad.'; } catch { document.querySelector('[data-clear-result]').textContent = 'El navegador no permitió borrar estos datos. Usa sus ajustes de almacenamiento.'; }
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
