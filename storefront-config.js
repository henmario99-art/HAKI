// Defaults are shared by the storefront and its existing administrator.
window.HAKI_COLLECTION_DEFAULTS = [
  { id: 'collection-1', nombre: 'Camisetas y tops', imagen: '', categoria: 'Camisetas' },
  { id: 'collection-2', nombre: 'Shorts', imagen: '', categoria: 'Shorts' },
  { id: 'collection-3', nombre: 'Joggers y pants', imagen: '', categoria: 'Pants' },
  { id: 'collection-4', nombre: 'Hoodies y sudaderas', imagen: '', categoria: 'Hoodies' }
];
window.hakiCollections = config => window.HAKI_COLLECTION_DEFAULTS.map((item, index) => ({
  ...item, ...(Array.isArray(config.colecciones) ? config.colecciones[index] : {}), id: item.id
}));

// Pulido visual del menú bajo TODAS LAS PRENDAS.
// Se mantiene únicamente en la vista general del catálogo.
(() => {
  const injectCatalogMenuPolish = () => {
    if (document.getElementById('haki-catalog-menu-polish')) return;
    const style = document.createElement('style');
    style.id = 'haki-catalog-menu-polish';
    style.textContent = `
      /* Ocultar filtros rápidos dentro de categorías, resultados y detalle */
      body.collection-view .catalog-quick-menu,
      body.detail-view .catalog-quick-menu{display:none!important}

      /* Barra superior del desplegable: dos opciones limpias */
      .catalog-quick-menu{
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        margin:0 0 28px!important;
        border-top:1px solid var(--line)!important;
        border-bottom:1px solid var(--line)!important;
        background:var(--surface)!important;
        overflow:visible!important;
      }
      .catalog-filter{position:relative!important;min-width:0!important}
      .catalog-filter:first-child{border-right:1px solid var(--line)!important}
      .catalog-filter summary{
        min-height:56px!important;
        padding:0 20px!important;
        background:var(--surface)!important;
        color:var(--ink)!important;
        font-size:13px!important;
        font-weight:650!important;
        letter-spacing:0!important;
        text-transform:none!important;
        border-bottom:2px solid transparent!important;
        transition:background .18s ease,border-color .18s ease!important;
      }
      .catalog-filter[open] summary{
        background:var(--surface)!important;
        border-bottom-color:var(--ink)!important;
      }
      .catalog-filter summary span{width:18px!important;height:18px!important;flex-basis:18px!important}
      .catalog-filter summary span::before,
      .catalog-filter summary span::after{
        left:3px!important;
        top:8px!important;
        width:12px!important;
        height:1.5px!important;
      }

      /* Panel de opciones estilo menú de navegación: ancho completo y filas verticales */
      .catalog-dropdown{
        top:100%!important;
        width:200%!important;
        max-height:min(430px,65vh)!important;
        padding:18px 0 20px!important;
        background:var(--surface)!important;
        color:var(--ink)!important;
        border:0!important;
        border-bottom:1px solid var(--line)!important;
        box-shadow:0 16px 28px rgba(0,0,0,.08)!important;
      }
      .catalog-filter:nth-child(2) .catalog-dropdown{left:auto!important;right:0!important}
      .catalog-dropdown a{
        min-height:58px!important;
        padding:0 22px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:space-between!important;
        gap:18px!important;
        border:0!important;
        background:transparent!important;
        color:var(--ink)!important;
        font-size:15px!important;
        font-weight:600!important;
        letter-spacing:0!important;
      }
      .catalog-dropdown a::after{
        content:'›';
        flex:0 0 auto;
        font-size:27px;
        line-height:1;
        font-weight:400;
      }
      .catalog-dropdown a:hover{background:var(--soft)!important}

      /* En oscuro, los distintivos claros deben conservar texto negro. */
      :root[data-theme=oscuro] .product-number:not(.sold-out),
      :root[data-theme=oscuro] .detail-new,
      :root[data-theme=oscuro] .detail-availability:not(.sold-out){
        background:#fff!important;
        color:#111!important;
      }
      :root[data-theme=oscuro] .product-number.sold-out,
      :root[data-theme=oscuro] .detail-availability.sold-out{
        background:#111!important;
        color:#fff!important;
      }
      :root[data-theme=oscuro] .catalog-dropdown{
        box-shadow:0 16px 32px rgba(0,0,0,.35)!important;
      }

      @media(max-width:800px){
        .catalog-quick-menu{margin-bottom:22px!important}
        .catalog-filter summary{min-height:52px!important;padding:0 15px!important;font-size:12px!important}
        .catalog-dropdown{padding:12px 0 16px!important;max-height:min(420px,72vh)!important}
        .catalog-dropdown a{min-height:55px!important;padding:0 18px!important;font-size:15px!important}
      }
      @media(prefers-reduced-motion:reduce){
        .catalog-filter summary{transition:none!important}
      }
    `;
    document.head.appendChild(style);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCatalogMenuPolish, { once: true });
  } else {
    injectCatalogMenuPolish();
  }
})();
