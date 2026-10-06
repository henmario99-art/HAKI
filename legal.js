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
    document.querySelector('[data-clear-browser]')?.addEventListener('click', () => {
      const keys = ['haki_cart_v1','haki_theme_v1','haki_catalog_cache_v4','haki_online_catalog_definitivo_v1','haki_cover_config_v1'];
      try { keys.forEach(key => localStorage.removeItem(key)); document.querySelector('[data-clear-result]').textContent = 'Se borraron la bolsa y estas preferencias locales. Los registros de compras y los mensajes se gestionan mediante una solicitud de privacidad.'; } catch { document.querySelector('[data-clear-result]').textContent = 'El navegador no permitió borrar estos datos. Usa sus ajustes de almacenamiento.'; }
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
