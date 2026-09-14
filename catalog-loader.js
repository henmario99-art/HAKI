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

// Hide the empty image flash on product detail views with a subtle themed skeleton and fade-in.
(() => {
  const style = document.createElement('style');
  style.id = 'haki-image-loading-transition';
  style.textContent = `
    #productDetail .detail-media{
      position:relative;
      overflow:hidden;
      background:#ececea;
    }
    :root[data-theme=oscuro] #productDetail .detail-media{
      background:#151515;
    }
    #productDetail .detail-media::before{
      content:'';
      position:absolute;
      inset:0;
      z-index:0;
      opacity:0;
      pointer-events:none;
      background:linear-gradient(105deg,#e7e7e5 20%,#f2f2f0 38%,#e7e7e5 56%);
      background-size:220% 100%;
      transition:opacity .18s ease;
    }
    :root[data-theme=oscuro] #productDetail .detail-media::before{
      background:linear-gradient(105deg,#151515 20%,#202020 38%,#151515 56%);
      background-size:220% 100%;
    }
    #productDetail .detail-media.haki-image-loading::before{
      opacity:1;
      animation:haki-image-shimmer 1.25s ease-in-out infinite;
    }
    #productDetail .detail-gallery{
      position:relative;
      z-index:1;
    }
    #productDetail .detail-gallery img{
      transition:opacity .34s ease,transform .45s ease;
    }
    #productDetail .detail-media.haki-image-loading .detail-gallery img:first-child{
      opacity:0;
    }
    #productDetail.haki-detail-entering .detail-layout{
      animation:haki-detail-enter .28s cubic-bezier(.2,.7,.25,1) both;
    }
    @keyframes haki-image-shimmer{
      0%{background-position:125% 0}
      100%{background-position:-75% 0}
    }
    @keyframes haki-detail-enter{
      from{opacity:.72;transform:translateY(5px)}
      to{opacity:1;transform:none}
    }
    @media(prefers-reduced-motion:reduce){
      #productDetail .detail-media::before{animation:none!important;transition:none!important}
      #productDetail .detail-gallery img{transition:none!important}
      #productDetail.haki-detail-entering .detail-layout{animation:none!important}
    }
  `;
  document.head.append(style);

  const detail = document.getElementById('productDetail');
  let lastDetailImage = '';

  function settle(media) {
    if (!media) return;
    requestAnimationFrame(() => {
      media.classList.remove('haki-image-loading');
      media.classList.add('haki-image-loaded');
    });
  }

  function prepareDetailImage() {
    if (!detail || detail.hidden) return;
    const media = detail.querySelector('.detail-media');
    const image = media?.querySelector('.detail-gallery img:first-child');
    if (!media || !image) return;

    const key = image.currentSrc || image.src || image.getAttribute('src') || '';
    if (key !== lastDetailImage) {
      lastDetailImage = key;
      detail.classList.remove('haki-detail-entering');
      void detail.offsetWidth;
      detail.classList.add('haki-detail-entering');
      setTimeout(() => detail.classList.remove('haki-detail-entering'), 340);
    }

    if (image.dataset.hakiLoadingReady === '1') return;
    image.dataset.hakiLoadingReady = '1';

    if (image.complete && image.naturalWidth > 0) {
      settle(media);
      return;
    }

    media.classList.remove('haki-image-loaded');
    media.classList.add('haki-image-loading');
    image.addEventListener('load', () => settle(media), { once:true });
    image.addEventListener('error', () => settle(media), { once:true });
  }

  if (detail) {
    new MutationObserver(prepareDetailImage).observe(detail, { childList:true, subtree:true });
    prepareDetailImage();
  }

  // Start downloading the main detail photo as soon as the user presses a product card.
  document.addEventListener('pointerdown', event => {
    const link = event.target.closest?.('.product-detail-link');
    const card = link?.closest?.('[data-code]');
    if (!card) return;
    const product = (window.HAKI_PRODUCTOS || []).find(item => item?.codigo === card.dataset.code);
    if (!product?.imagen || typeof window.hakiImage !== 'function') return;
    const preload = new Image();
    preload.decoding = 'async';
    preload.src = window.hakiImage(product.imagen, 1200);
  }, { capture:true, passive:true });
})();

// Render the bundled/cached catalog immediately, refresh current data in the background.
(() => {
  const key='haki_catalog_cache_v2';
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
      const response=await fetch('https://raw.githubusercontent.com/henmario99-art/HAKI/main/productos.js?v='+Math.floor(Date.now()/60000),{signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw new Error('Catalog unavailable');
      const source=await response.text();
      const a=source.match(/window\.HAKI_CONFIG\s*=\s*(\{[\s\S]*?\});\s*window\.HAKI_PRODUCTOS/),b=source.match(/window\.HAKI_PRODUCTOS\s*=\s*(\[[\s\S]*\]);\s*$/);
      if(!a||!b)return;
      const data=polish({config:JSON.parse(a[1]),products:JSON.parse(b[1])});if(!valid(data))return;
      const changed=JSON.stringify(data)!==JSON.stringify({config:window.HAKI_CONFIG,products:window.HAKI_PRODUCTOS});
      try{localStorage.setItem(key,JSON.stringify(data));}catch{}
      if(changed){apply(data);window.dispatchEvent(new Event('haki:catalog-updated'));}
    }catch{/* Keep the usable local catalog when the network is slow/offline. */}finally{busy=false;}
  }
  window.addEventListener('DOMContentLoaded',()=>{refresh();setInterval(refresh,60000);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
