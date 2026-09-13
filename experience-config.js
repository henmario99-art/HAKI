(() => {
  const defaults = {
    tema:'claro', fuenteTitulos:'Horizon', fuenteTexto:'Poppins', horizonUrl:'',
    anuncio2:'Envío gratis desde $70 en prendas', anuncio3:'Encuentra tu próximo outfit HAKI',
    botonPortada:'EXPLORAR COLECCIÓN', enlacePortada:'#catalogo', botonPortada2:'VER NOVEDADES', enlacePortada2:'#novedades',
    estiloBotonPortada:'blanco', estiloBotonPortada2:'transparente',
    buscarTexto:'Escribe un código o nombre de prenda…',
    carritoTitulo:'MI CARRITO', carritoAntetitulo:'TU SELECCIÓN', carritoVacio:'Tu carrito está vacío.', carritoAyudaVacio:'Elige una talla y añade tus prendas favoritas.',
    envioMeta:70, envioCosto:1, envioPorPrenda:true,
    envioFalta:'Te faltan {monto} para obtener envío gratis', envioListo:'¡Tienes envío gratis a todo El Salvador!',
    envioInformacion:'Envío gratis a todo el país desde $70 en prendas. En compras menores, el costo estimado corresponde a encomienda; el envío a domicilio se confirma al cotizar.',
    carritoAviso:'Tus prendas no están reservadas. Solicita tu cotización para confirmar disponibilidad.',
    sugerenciasTitulo:'COMPLETA TU PEDIDO', sugerenciasTexto:'Añade una de estas prendas y acércate al envío gratis.',
    sugerenciasAgregar:'Añadir', sugerenciasTalla:'Talla',
    resumenTitulo:'RESUMEN DEL PEDIDO', subtotalTexto:'Subtotal de prendas', envioTexto:'Envío estimado', totalTexto:'Total estimado', gratisTexto:'GRATIS', eliminarTexto:'Eliminar',
    datosTitulo:'DATOS PARA COTIZAR', nombreTexto:'Nombre', nombrePlaceholder:'Tu nombre', departamentoTexto:'Departamento', departamentoPlaceholder:'Ej. Santa Ana', municipioTexto:'Municipio', municipioPlaceholder:'Ej. Santa Ana',
    whatsappTexto:'SOLICITAR POR WHATSAPP', instagramTexto:'SOLICITAR POR INSTAGRAM', carritoAyuda:'Confirma tu envío y disponibilidad al solicitar la cotización. Para Instagram, pegá el texto copiado en el chat.',
    saludoCotizacion:'Hola HAKI 👋\nQuiero solicitar una cotización.'
  };
  window.HAKI_DEFAULTS=defaults;
  window.hakiSettings=config=>({...defaults,...config});
  window.hakiTotals=(subtotal,count,config)=>{
    const c=window.hakiSettings(config), cents=Math.round(Number(subtotal)*100);
    const meta=Number.isFinite(+c.envioMeta)&&+c.envioMeta>0?Math.round(+c.envioMeta*100):7000;
    const rate=Number.isFinite(+c.envioCosto)&&+c.envioCosto>=0?Math.round(+c.envioCosto*100):100;
    const free=count>0&&cents>=meta;
    const shipping=!count||free?0:rate*(c.envioPorPrenda===true||c.envioPorPrenda==='true'?count:1);
    return {subtotal:cents/100,shipping:shipping/100,total:(cents+shipping)/100,free,remaining:Math.max(0,meta-cents)/100,progress:Math.min(100,cents/meta*100),threshold:meta/100};
  };
  const brokenImageVariants=new Set([
    'images/optimized/06de4e28143e-800.webp',
    'images/optimized/2e82ffe16ce2-800.webp',
    'images/optimized/3fbbc9a12792-1080.webp',
    'images/optimized/46cbbf8eef87-1200.webp',
    'images/optimized/92af4e6950b3-960.webp',
    'images/optimized/b5469b80bec9-1400.webp'
  ]);
  const imageItems=url=>((window.HAKI_IMAGES||{})[url]||[]).filter(v=>v&&v.src&&!brokenImageVariants.has(v.src));
  window.hakiImage=(url='',size=800)=>{
    const items=imageItems(url);
    if(items.length) return (items.find(v=>v.width>=size)||items.at(-1)).src;
    if(!url) return 'images/producto.svg';
    if(/^(https?:|data:|blob:)/i.test(url))return url;
    if(/\.svg$/i.test(url))return url;
    return 'https://raw.githubusercontent.com/henmario99-art/HAKI/main/'+String(url).replace(/^\/?(?:\.\/)?/,'');
  };
  window.hakiSrcset=url=>imageItems(url).map(v=>`${v.src} ${v.width}w`).join(', ');
  window.hakiSafeLink=(value,fallback='#catalogo')=>{try{const u=new URL(value,location.href);return ['https:','http:'].includes(u.protocol)?value:fallback;}catch{return fallback;}};

  const animateShippingProgressOnManualOpen=()=>{
    const native=document.getElementById('shippingProgress');
    const visual=document.getElementById('hakiShippingProgress');
    const fill=visual?.querySelector('.haki-shipping-fill');
    const drawer=document.getElementById('cartDrawer');
    if(!native||!visual||!fill||drawer?.classList.contains('is-empty'))return;
    const target=Math.max(0,Math.min(100,Number(native.value)||0));
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      fill.style.width=`${target}%`;
      return;
    }
    fill.style.transition='none';
    fill.style.width='0%';
    void fill.offsetWidth;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      fill.style.transition='';
      fill.style.width=`${target}%`;
      fill.dataset.progress=String(target);
    }));
  };
  document.getElementById('openCart')?.addEventListener('click',animateShippingProgressOnManualOpen);

  const THEME_KEY='haki_theme_v1';
  const root=document.documentElement;
  const savedTheme=(()=>{try{return localStorage.getItem(THEME_KEY)||'';}catch{return '';}})();
  if(savedTheme==='oscuro'||savedTheme==='claro'){
    root.dataset.theme=savedTheme;
    if(window.HAKI_CONFIG) window.HAKI_CONFIG.tema=savedTheme;
  }

  const themeIcon=theme=>theme==='oscuro'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>';

  const currentTheme=()=>root.dataset.theme==='oscuro'?'oscuro':'claro';

  function syncThemeButton(button){
    if(!button)return;
    const theme=currentTheme();
    button.innerHTML=themeIcon(theme);
    button.setAttribute('aria-label',theme==='oscuro'?'Cambiar a modo claro':'Cambiar a modo oscuro');
    button.title=theme==='oscuro'?'Modo oscuro · cambiar a claro':'Modo claro · cambiar a oscuro';
    button.setAttribute('aria-pressed',String(theme==='oscuro'));
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=theme==='oscuro'?'#151515':'#ffffff';
  }

  function applyUserTheme(theme,button,save=true){
    const next=theme==='oscuro'?'oscuro':'claro';
    root.dataset.theme=next;
    if(window.HAKI_CONFIG)window.HAKI_CONFIG.tema=next;
    if(save){try{localStorage.setItem(THEME_KEY,next);}catch{}}
    syncThemeButton(button);
  }

  function setupThemeToggle(){
    const headerLeft=document.querySelector('.header > .header-side:not(.header-right)');
    if(!headerLeft)return;

    let button=document.getElementById('themeToggle');
    if(!button){
      button=document.createElement('button');
      button.id='themeToggle';
      button.className='header-icon theme-toggle';
      button.type='button';
      const instagram=document.getElementById('instagramHeader');
      if(instagram?.nextSibling) headerLeft.insertBefore(button,instagram.nextSibling);
      else headerLeft.appendChild(button);
    } else if(button.parentElement!==headerLeft){
      headerLeft.appendChild(button);
    }

    if(!document.getElementById('haki-theme-toggle-style')){
      const style=document.createElement('style');
      style.id='haki-theme-toggle-style';
      style.textContent=`
        #openMenu{display:none!important}
        .header > .header-side:not(.header-right){gap:14px!important}
        .theme-toggle{color:var(--ink)!important;transition:color .2s ease,transform .2s ease}
        .theme-toggle svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        .theme-toggle:hover{transform:rotate(8deg)}
        :root[data-theme=oscuro] .header .header-icon,
        :root[data-theme=oscuro] .header .header-icon svg,
        :root[data-theme=oscuro] .header .desktop-search,
        :root[data-theme=oscuro] .header .desktop-search svg,
        :root[data-theme=oscuro] .theme-toggle{color:#fff!important}
        :root[data-theme=oscuro] .header .desktop-search input{color:#fff!important}
        :root[data-theme=oscuro] .header .desktop-search input::placeholder{color:#a9a9a9!important}
        :root[data-theme=oscuro] .header{border-bottom-color:#303030!important}
        :root[data-theme=oscuro] .search-panel .header-icon{color:#fff!important}
        @media(max-width:800px){.header-right{gap:8px!important}.header > .header-side:not(.header-right){gap:8px!important}.theme-toggle{width:40px;min-width:40px;height:40px;padding:7px}.theme-toggle svg{width:22px;height:22px}}
        @media(prefers-reduced-motion:reduce){.theme-toggle{transition:none!important}.theme-toggle:hover{transform:none}}
      `;
      document.head.appendChild(style);
    }

    if(button.dataset.themeReady!=='1'){
      button.dataset.themeReady='1';
      button.addEventListener('click',()=>{
        applyUserTheme(currentTheme()==='oscuro'?'claro':'oscuro',button,true);
      });
    }

    const saved=(()=>{try{return localStorage.getItem(THEME_KEY)||'';}catch{return '';}})();
    const configured=window.hakiSettings(window.HAKI_CONFIG||{}).tema==='oscuro'?'oscuro':'claro';
    applyUserTheme(saved==='oscuro'||saved==='claro'?saved:configured,button,false);

    if(!root.dataset.themeToggleObserved){
      root.dataset.themeToggleObserved='1';
      new MutationObserver(()=>{
        const preference=(()=>{try{return localStorage.getItem(THEME_KEY)||'';}catch{return '';}})();
        if((preference==='oscuro'||preference==='claro')&&currentTheme()!==preference){
          root.dataset.theme=preference;
          if(window.HAKI_CONFIG)window.HAKI_CONFIG.tema=preference;
        }
        syncThemeButton(button);
      }).observe(root,{attributes:true,attributeFilter:['data-theme']});
    }
  }

  function setupCatalogMenus(){
    const catalog=document.getElementById('catalogo');
    const heading=catalog?.querySelector('.catalog-heading');
    if(!catalog||!heading||catalog.querySelector('.catalog-quick-menu'))return;

    const esc=value=>String(value||'').replace(/[&<>"']/g,char=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[char]);
    const collections=typeof window.hakiCollections==='function'
      ? window.hakiCollections(window.HAKI_CONFIG||{})
      : (window.HAKI_COLLECTION_DEFAULTS||[]);
    const categoryItems=collections.length
      ? collections.filter(item=>item&&item.id&&item.nombre).map(item=>({label:item.nombre,href:`#coleccion/${encodeURIComponent(item.id)}`}))
      : [
          {label:'Compresión',href:'#categoria/Compresi%C3%B3n'},
          {label:'Oversized',href:'#categoria/Oversized'},
          {label:'Pants',href:'#categoria/Pants'}
        ];

    const nav=document.createElement('nav');
    nav.className='catalog-quick-menu';
    nav.setAttribute('aria-label','Categorías del catálogo');
    nav.innerHTML=`
      <details class="catalog-filter catalog-filter-options">
        <summary><span class="catalog-filter-label">FILTROS</span><span class="catalog-filter-chevron" aria-hidden="true"></span></summary>
        <div class="catalog-dropdown">
          <section class="catalog-filter-group catalog-category-links">
            <a href="#catalogo"><span>Todas las prendas</span></a>
            ${categoryItems.map(item=>`<a href="${esc(item.href)}"><span>${esc(item.label)}</span></a>`).join('')}
          </section>
        </div>
      </details>
      <details class="catalog-filter catalog-filter-shipping">
        <summary><span class="catalog-filter-label">ENVÍOS</span><span class="catalog-filter-chevron" aria-hidden="true"></span></summary>
        <div class="catalog-dropdown">
          <a href="encomiendas.html">Encomiendas</a>
          <a href="domicilios.html">Domicilios</a>
        </div>
      </details>`;
    heading.insertAdjacentElement('afterend',nav);

    const details=[...nav.querySelectorAll('details')];
    const hoverMode=()=>window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    details.forEach(detail=>{
      detail.addEventListener('mouseenter',()=>{
        if(!hoverMode())return;
        details.forEach(other=>{if(other!==detail)other.open=false;});
        detail.open=true;
      });
      detail.addEventListener('mouseleave',()=>{
        if(hoverMode())detail.open=false;
      });
      detail.addEventListener('toggle',()=>{
        if(!detail.open)return;
        details.forEach(other=>{if(other!==detail)other.open=false;});
      });
    });
    nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>details.forEach(detail=>detail.open=false)));
    document.addEventListener('click',event=>{
      if(!nav.contains(event.target)) details.forEach(detail=>detail.open=false);
    });

    const backHome=document.querySelector('.back-home');
    if(backHome){
      backHome.textContent='Volver al inicio';
      backHome.classList.add('haki-chevron-back');
    }

    if(!document.getElementById('haki-catalog-menu-style')){
      const style=document.createElement('style');
      style.id='haki-catalog-menu-style';
      style.textContent=`
        .catalog-quick-menu{display:grid;grid-template-columns:1fr 1fr;position:relative;z-index:24;margin:2px 0 24px;background:transparent;border:0!important}
        .catalog-filter{position:relative;min-width:0;border:0!important}
        .catalog-filter:first-child{border-right:0!important}
        .catalog-filter summary{list-style:none;min-height:44px;padding:0 8px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;color:var(--ink);font-size:11px;font-weight:650;letter-spacing:.035em;text-transform:uppercase;user-select:none;text-decoration:none!important;border:0!important;background:transparent!important}
        .catalog-filter summary::-webkit-details-marker{display:none}
        .catalog-filter summary .catalog-filter-label{width:auto;height:auto;flex:0 1 auto;position:static;display:inline;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:5px;transition:text-decoration-color .16s ease}
        .catalog-filter summary:hover .catalog-filter-label,.catalog-filter summary:focus-visible .catalog-filter-label{color:inherit;text-decoration-color:currentColor}
        .catalog-filter summary .catalog-filter-chevron{position:relative;width:16px;height:12px;flex:0 0 16px;display:inline-block}
        .catalog-filter summary .catalog-filter-chevron::before,.catalog-filter summary .catalog-filter-chevron::after{content:'';position:absolute;top:5px;width:8px;height:1.6px;background:currentColor;border-radius:2px;transition:transform .18s ease,top .18s ease}
        .catalog-filter summary .catalog-filter-chevron::before{left:1px;transform:rotate(45deg);transform-origin:right center}
        .catalog-filter summary .catalog-filter-chevron::after{right:1px;transform:rotate(-45deg);transform-origin:left center}
        .catalog-filter[open] summary .catalog-filter-chevron::before{top:4px;transform:rotate(-45deg)}
        .catalog-filter[open] summary .catalog-filter-chevron::after{top:4px;transform:rotate(45deg)}
        .catalog-dropdown{position:absolute;top:100%;left:0;width:200%;max-height:360px;overflow-y:auto;background:var(--surface);border:0!important;border-top:1px solid var(--line)!important;box-shadow:0 16px 34px rgba(0,0,0,.10);padding:12px 0;z-index:40}
        .catalog-filter:nth-child(2) .catalog-dropdown{left:auto;right:0}
        .catalog-dropdown a{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:48px;padding:0 18px;color:var(--ink);text-decoration:none!important;font-size:12px;font-weight:550;border:0!important;background:transparent!important}
        .catalog-dropdown a::after{content:'';width:8px;height:8px;flex:0 0 8px;border-right:1.6px solid currentColor;border-bottom:1.6px solid currentColor;transform:rotate(-45deg);margin-right:3px}
        .catalog-dropdown a>span{text-decoration:underline;text-decoration-color:transparent;text-underline-offset:5px;transition:text-decoration-color .16s ease}
        .catalog-dropdown a:hover>span,.catalog-dropdown a:focus-visible>span{text-decoration-color:currentColor}
        .catalog-filter-options .catalog-dropdown{display:block;padding:18px!important}
        .catalog-filter-group{min-width:0;padding:0 18px;border:0}
        .catalog-filter-group>a{min-height:44px!important;padding:0!important;font-size:12px!important}
        :root[data-theme=oscuro] .catalog-dropdown{box-shadow:0 16px 36px rgba(0,0,0,.38)}
        .haki-chevron-back{text-decoration:none!important;display:inline-flex!important;align-items:center;gap:8px}
        .haki-chevron-back::before{content:'';width:8px;height:8px;border-left:1.6px solid currentColor;border-bottom:1.6px solid currentColor;transform:rotate(45deg);flex:0 0 8px}
        .rail-actions .rail-prev,.rail-actions .rail-next{font-size:0!important;position:relative}
        .rail-actions .rail-prev::before,.rail-actions .rail-next::before{content:'';width:8px;height:8px;border-bottom:1.6px solid currentColor;display:block}
        .rail-actions .rail-prev::before{border-left:1.6px solid currentColor;transform:rotate(45deg)}
        .rail-actions .rail-next::before{border-right:1.6px solid currentColor;transform:rotate(-45deg)}
        .haki-empty-cta>span{font-size:0!important;width:8px;height:8px;border-right:1.6px solid currentColor;border-bottom:1.6px solid currentColor;transform:rotate(-45deg);display:inline-block}
        @media(hover:hover) and (pointer:fine){
          .catalog-filter summary{padding-left:4px;padding-right:14px}
        }
        @media(max-width:800px){
          .catalog-quick-menu{margin:0 0 18px;gap:0}
          .catalog-filter summary{min-height:40px;padding:0 4px;font-size:10px;font-weight:650;letter-spacing:.025em}
          .catalog-filter summary .catalog-filter-chevron{width:15px;height:11px;flex-basis:15px}
          .catalog-filter summary .catalog-filter-chevron::before,.catalog-filter summary .catalog-filter-chevron::after{top:5px;width:7.5px;height:1.5px}
          .catalog-filter summary .catalog-filter-chevron::before{left:0}
          .catalog-filter summary .catalog-filter-chevron::after{right:0}
          .catalog-filter[open] summary .catalog-filter-chevron::before,.catalog-filter[open] summary .catalog-filter-chevron::after{top:4px}
          .catalog-dropdown{width:200%;padding:8px 0;box-shadow:0 12px 26px rgba(0,0,0,.12)}
          .catalog-dropdown a{min-height:44px;padding:0 14px;font-size:11px}
          .catalog-dropdown a::after{width:7px;height:7px;border-width:1.5px}
          .catalog-filter-options .catalog-dropdown{padding:18px!important}
          .catalog-filter-group{padding:0;border-right:0}
        }
        @media(prefers-reduced-motion:reduce){.catalog-filter summary .catalog-filter-label,.catalog-filter summary .catalog-filter-chevron::before,.catalog-filter summary .catalog-filter-chevron::after,.catalog-dropdown a>span{transition:none!important}}
      `;
      document.head.appendChild(style);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',setupThemeToggle,{once:true});
    document.addEventListener('DOMContentLoaded',setupCatalogMenus,{once:true});
  } else {
    setupThemeToggle();
    if(document.readyState==='complete') setupCatalogMenus();
    else document.addEventListener('DOMContentLoaded',setupCatalogMenus,{once:true});
  }
})();
