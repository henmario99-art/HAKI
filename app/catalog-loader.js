// Optimize every local raster image through Netlify Image CDN, including uploads not present in the legacy manifest.
(() => {
  const legacyItems = url => ((window.HAKI_IMAGES || {})[url] || []).filter(v => v && v.src && v.width);
  const isRemote = url => /^(https?:|data:|blob:)/i.test(String(url || ''));
  const isSvg = url => /\.svg(?:[?#]|$)/i.test(String(url || ''));
  const netlifyImage = (url = '', size = 800) => {
    const clean = String(url || '').replace(/^\/?(?:\.\/)?/, '');
    if (!clean) return 'images/producto.svg';
    const width = Math.max(160, Math.min(1920, Math.round(Number(size) || 800)));
    return `/.netlify/images?url=${encodeURIComponent('/' + clean)}&w=${width}&q=80`;
  };
  const originalHakiImage = window.hakiImage;
  const originalSrcset = window.hakiSrcset;

  window.hakiImage = (url = '', size = 800) => {
    const items = legacyItems(url);
    if (items.length && typeof originalHakiImage === 'function') return originalHakiImage(url, size);
    if (!url) return 'images/producto.svg';
    if (isRemote(url) || isSvg(url)) return typeof originalHakiImage === 'function' ? originalHakiImage(url, size) : url;
    return netlifyImage(url, size);
  };

  window.hakiSrcset = url => {
    const items = legacyItems(url);
    if (items.length && typeof originalSrcset === 'function') return originalSrcset(url);
    if (!url || isRemote(url) || isSvg(url)) return '';
    return [400, 800, 1200]
      .map(width => `${netlifyImage(url, width)} ${width}w`)
      .join(', ');
  };
})();

// Preload the detail image on user intent. Native image painting handles decode;
// never hide an already available image and reveal it again on the next frame.
(() => {
  const warmed = new Set();
  function preloadDetail(link) {
    const card = link?.closest?.('[data-code]');
    if (!card) return;
    const product = (window.HAKI_PRODUCTOS || []).find(item => item?.codigo === card.dataset.code);
    if (!product?.imagen || typeof window.hakiImage !== 'function') return;
    const src = window.hakiImage(product.imagen, 1400);
    if (!src || warmed.has(src)) return;
    warmed.add(src);
    const preload = new Image();
    preload.decoding = 'async';
    preload.fetchPriority = 'high';
    preload.src = src;
    preload.decode?.().catch(() => {});
  }

  // Warm the exact same 1400px URL that the PDP uses, based on user intent.
  document.addEventListener('pointerdown', event => {
    preloadDetail(event.target.closest?.('.product-detail-link'));
  }, { capture:true, passive:true });
  document.addEventListener('pointerenter', event => {
    preloadDetail(event.target.closest?.('.product-detail-link'));
  }, { capture:true, passive:true });
  document.addEventListener('focusin', event => {
    preloadDetail(event.target.closest?.('.product-detail-link'));
  }, true);
})();

// Render the bundled/cached catalog immediately, refresh current data in the background.
(() => {
  const key='haki_app_catalog_cache_v2';
  const valid=d=>d&&d.config&&typeof d.config==='object'&&Array.isArray(d.products)&&d.products.every(p=>p&&typeof p.codigo==='string'&&typeof p.nombre==='string');
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const upper=value=>String(value||'').toLocaleUpperCase('es-SV');

  const style=document.createElement('style');
  style.id='haki-category-arrow-alignment';
  style.textContent=`
    #collectionsGrid .collection-tile{position:relative!important;align-items:center!important;padding-right:38px!important}
    #collectionsGrid .collection-tile::after{position:absolute!important;right:0!important;top:50%!important;transform:translateY(-50%)!important;margin:0!important;align-self:auto!important}
  `;
  document.head.append(style);

  function polish(data){
    if(!data||typeof data!=='object')return data;
    data.config ||= {};
    let appTheme = '';
    try { appTheme = localStorage.getItem('haki_app_theme_v1'); } catch {}
    data.config.tema = appTheme === 'claro' ? 'claro' : 'oscuro';
    // Installed mode uses the exact same cover configured in /admin/ as the normal website.
    // Do not override portada/portadaRespaldo here.
    data.config.frase='HAKI';
    data.config.subfrase='Haki | Anime & Sports | El Salvador';
    data.config.buscarTexto='BUSCAR PRENDA...';
    data.config.estiloBotonPortada='blanco';
    data.config.estiloBotonPortada2='transparente';
    if(Array.isArray(data.config.colecciones)){
      data.config.colecciones.forEach(collection=>{
        const name=norm(collection?.nombre);
        if(name==='accesorios') collection.nombre='Shorts y Pants';
        if(name==='camisas, centros'||name==='camisas centros') collection.nombre='Camisas y Centros';
      });
    }
    if(Array.isArray(data.products)){
      data.products.forEach(product=>{
        if(!product||typeof product!=='object')return;
        product.codigo=upper(product.codigo);
        product.nombre=upper(product.nombre);
      });
    }
    return data;
  }

  function apply(data){
    const fixed=polish(data);
    window.HAKI_CONFIG=fixed.config;
    window.HAKI_PRODUCTOS=fixed.products;
    return fixed;
  }

  apply({config:window.HAKI_CONFIG||{},products:window.HAKI_PRODUCTOS||[]});

  try {
    const cached=JSON.parse(localStorage.getItem(key));
    if(valid(cached)) apply(cached);
  }catch{}

  let busy=false;
  async function refresh(){
    if(busy||document.hidden)return;busy=true;
    try{
      const response=await fetch('https://uysfqzlihiosebqzvfrl.supabase.co/functions/v1/haki-operations?mode=public-catalog',{cache:'no-store',signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error('Catalog unavailable');
      const data=polish(await response.json());if(!valid(data))return;
      const changed=JSON.stringify(data)!==JSON.stringify({config:window.HAKI_CONFIG,products:window.HAKI_PRODUCTOS});
      try{localStorage.setItem(key,JSON.stringify(data));}catch{}
      if(changed){apply(data);window.dispatchEvent(new Event('haki:catalog-updated'));}
    }catch{/* Keep the usable local catalog when the network is slow/offline. */}finally{busy=false;}
  }
  window.addEventListener('DOMContentLoaded',()=>{refresh();setInterval(refresh,300000);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();


// Stock operativo HAKI: actualización directa desde Supabase sin deploy ni Netlify Function.
(() => {
  const endpoint='https://uysfqzlihiosebqzvfrl.supabase.co/functions/v1/haki-operations?mode=availability';
  let busy=false;

  async function refreshAvailability(){
    if(busy||document.hidden)return;
    busy=true;
    try{
      const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw new Error('Stock unavailable');
      const data=await response.json();
      if(!data?.migrated||!data.inventory||typeof data.inventory!=='object')return;

      const current=window.HAKI_PRODUCTOS||[];
      let changed=false;
      const next=current.map(product=>{
        const stock=data.inventory[String(product.codigo||'').toUpperCase()]||data.inventory[String(product.id)];
        if(!stock)return product;
        const tallas={...(product.tallas||{})};
        for(const size of ['S','M','L','XL']){
          if(Object.hasOwn(stock,size)){
            const available=Number(stock[size])>0;
            if(tallas[size]!==available)changed=true;
            tallas[size]=available;
          }
        }
        return {...product,tallas};
      });

      if(!changed)return;
      window.HAKI_PRODUCTOS=next;
      try{
        localStorage.setItem('haki_catalog_cache_v3',JSON.stringify({
          config:window.HAKI_CONFIG||{},
          products:next
        }));
      }catch{}
      window.dispatchEvent(new Event('haki:catalog-updated'));
    }catch{}finally{busy=false;}
  }

  window.addEventListener('DOMContentLoaded',()=>{
    refreshAvailability();
    setInterval(refreshAvailability,45000);
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAvailability();});
})();
