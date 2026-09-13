(() => {
  const defaults = {
    tema:'claro', fuenteTitulos:'Horizon', fuenteTexto:'Poppins', horizonUrl:'',
    anuncio2:'Envío gratis desde $70 en prendas', anuncio3:'Encuentra tu próximo outfit HAKI',
    botonPortada:'EXPLORAR COLECCIÓN', enlacePortada:'#catalogo', botonPortada2:'VER NOVEDADES', enlacePortada2:'#novedades',
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
    const collections=Array.isArray(window.HAKI_CONFIG?.colecciones)?window.HAKI_CONFIG.colecciones:[];
    const categoryItems=collections.length
      ? collections.filter(item=>item&&item.id&&item.nombre).map(item=>({label:item.nombre,href:`#coleccion/${encodeURIComponent(item.id)}`}))
      : [
          {label:'Compresión',href:'#categoria/Compresi%C3%B3n'},
          {label:'Oversized',href:'#categoria/Oversized'},
          {label:'Pants',href:'#categoria/Pants'}
        ];

    const nav=document.createElement('nav');
    nav.className='catalog-quick-menu';
    nav.setAttribute('aria-label','Filtros del catálogo');
    nav.innerHTML=`
      <details class="catalog-filter catalog-filter-categories">
        <summary>CATEGORÍAS <span aria-hidden="true"></span></summary>
        <div class="catalog-dropdown">
          <a href="#catalogo">Todas las prendas</a>
          ${categoryItems.map(item=>`<a href="${esc(item.href)}">${esc(item.label)}</a>`).join('')}
        </div>
      </details>
      <details class="catalog-filter catalog-filter-shipping">
        <summary>ENVÍOS <span aria-hidden="true"></span></summary>
        <div class="catalog-dropdown">
          <a href="encomiendas.html">Encomiendas</a>
          <a href="domicilios.html">Domicilios</a>
        </div>
      </details>`;
    heading.insertAdjacentElement('afterend',nav);

    const details=[...nav.querySelectorAll('details')];
    details.forEach(detail=>{
      detail.addEventListener('toggle',()=>{
        if(!detail.open)return;
        details.forEach(other=>{if(other!==detail)other.open=false;});
      });
    });
    nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>details.forEach(detail=>detail.open=false)));
    document.addEventListener('click',event=>{
      if(!nav.contains(event.target)) details.forEach(detail=>detail.open=false);
    });

    if(!document.getElementById('haki-catalog-menu-style')){
      const style=document.createElement('style');
      style.id='haki-catalog-menu-style';
      style.textContent=`
        .catalog-quick-menu{display:grid;grid-template-columns:1fr 1fr;position:relative;z-index:24;margin:0 0 26px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--surface)}
        .catalog-filter{position:relative;min-width:0}
        .catalog-filter:first-child{border-right:1px solid var(--line)}
        .catalog-filter summary{list-style:none;min-height:52px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;gap:14px;cursor:pointer;color:var(--ink);font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;user-select:none}
        .catalog-filter summary::-webkit-details-marker{display:none}
        .catalog-filter summary span{position:relative;width:14px;height:14px;flex:0 0 14px}
        .catalog-filter summary span::before,.catalog-filter summary span::after{content:'';position:absolute;left:2px;top:6px;width:10px;height:1.5px;background:currentColor;transition:transform .2s ease}
        .catalog-filter summary span::after{transform:rotate(90deg)}
        .catalog-filter[open] summary span::after{transform:rotate(0)}
        .catalog-filter[open] summary{background:var(--soft)}
        .catalog-dropdown{position:absolute;top:100%;left:0;width:200%;max-height:330px;overflow-y:auto;background:var(--surface);border:1px solid var(--line);box-shadow:0 14px 30px rgba(0,0,0,.12);padding:6px 0;z-index:40}
        .catalog-filter:nth-child(2) .catalog-dropdown{left:auto;right:0}
        .catalog-dropdown a{display:flex;align-items:center;min-height:46px;padding:0 16px;color:var(--ink);text-decoration:none;font-size:12px;font-weight:500;border-bottom:1px solid var(--line)}
        .catalog-dropdown a:last-child{border-bottom:0}
        .catalog-dropdown a:hover{background:var(--soft)}
        :root[data-theme=oscuro] .catalog-dropdown{box-shadow:0 14px 32px rgba(0,0,0,.4)}
        @media(max-width:800px){.catalog-quick-menu{margin-bottom:20px}.catalog-filter summary{min-height:48px;padding:0 12px;font-size:11px}.catalog-dropdown a{min-height:44px;padding:0 14px}}
        @media(prefers-reduced-motion:reduce){.catalog-filter summary span::before,.catalog-filter summary span::after{transition:none!important}}
      `;
      document.head.appendChild(style);
    }
  }

  const setupHeaderAndCatalog=()=>{
    setupThemeToggle();
    setupCatalogMenus();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupHeaderAndCatalog,{once:true});
  else setupHeaderAndCatalog();
})();
