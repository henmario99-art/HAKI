// Render the bundled/cached catalog immediately, refresh current data in the background.
(() => {
  const key='haki_catalog_cache_v2';
  const sizes=['S','M','L','XL'];
  const valid=d=>d&&d.config&&typeof d.config==='object'&&Array.isArray(d.products)&&d.products.every(p=>p&&typeof p.codigo==='string'&&typeof p.nombre==='string');
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const upper=value=>String(value||'').toLocaleUpperCase('es-SV');

  // STOCK actual + pedido nuevo. Solo se incluyen referencias identificadas con seguridad.
  // GSC-06 se deja sin sobrescribir porque el archivo STOCK repite ese código en prendas visualmente distintas.
  // YLAF2-01: el pedido dice 6 unidades, pero las tallas escritas suman 5; se suman solo las tallas explícitas.
  const initialStock={
    'BATC-01':{S:1,M:3,L:2,XL:0},
    'BATC-02':{S:0,M:2,L:1,XL:0},
    'BATC-06':{S:1,M:1,L:1,XL:0},
    'SUPC-01':{S:2,M:4,L:4,XL:1},
    'SUPC-03':{S:1,M:1,L:2,XL:1},
    'YLAC-01':{S:1,M:3,L:1,XL:1},
    'YLAC-06':{S:1,M:0,L:1,XL:0},
    'YLAC-03':{S:1,M:0,L:0,XL:0},
    'GSC-04':{S:0,M:0,L:1,XL:0},
    'GSC-03':{S:2,M:2,L:3,XL:2},
    'GSC-08':{S:1,M:0,L:2,XL:0},
    'GSL1-03':{S:0,M:1,L:0,XL:0},
    'SUPH-06':{S:1,M:1,L:2,XL:0},
    'SUPH-01':{S:0,M:1,L:1,XL:0},
    'BDC1:1-09':{S:0,M:1,L:1,XL:0},
    'BDC1:1-01':{S:1,M:1,L:0,XL:0},
    'BDC-06':{S:1,M:0,L:0,XL:0},
    'BDC-03':{S:2,M:0,L:0,XL:0},
    'BDC-01':{S:1,M:0,L:0,XL:0},
    'BDH-01':{S:1,M:0,L:0,XL:0},
    'BATL-01':{S:0,M:0,L:1,XL:1},
    'BATL-02':{S:1,M:1,L:1,XL:0},
    'SUPL-01':{S:0,M:1,L:0,XL:0},
    'GSL-06':{S:0,M:1,L:0,XL:0},
    'YLAF-01':{S:2,M:3,L:2,XL:2},
    'YLAF-03':{S:1,M:1,L:1,XL:0},
    'YLAF1-01':{S:2,M:3,L:2,XL:2},
    'YLAF2-01':{S:1,M:2,L:2,XL:1},
    'YLAF1-02':{S:0,M:0,L:0,XL:0},
    'ARG':{S:0,M:0,L:0,XL:0},
    'POR':{S:0,M:0,L:0,XL:0},
    'AOTF-02':{S:1,M:0,L:0,XL:1},
    'AOTF-01':{S:1,M:0,L:0,XL:0},
    'AOTF-03':{S:1,M:0,L:0,XL:0},
    'YLAO-01':{S:0,M:0,L:1,XL:0},
    'GLD-01':{S:1,M:1,L:1,XL:1},
    'YLAP-01':{S:1,M:1,L:2,XL:1},
    'AOTP-06':{S:1,M:0,L:0,XL:0},
    'YLAP1-01':{S:0,M:1,L:2,XL:1},
    'YLAP3-01':{S:0,M:1,L:2,XL:1},
    'YLAP4-01':{S:0,M:1,L:1,XL:1}
  };

  function savedStock(product){
    return product?.stock&&sizes.every(size=>Number.isFinite(Number(product.stock[size])));
  }

  function applyInventory(product){
    if(!product||typeof product!=='object')return;
    const code=upper(product.codigo);
    const source=initialStock[code]|| (savedStock(product)?product.stock:null);
    if(!source)return;
    product.stock={};
    product.tallas ||= {};
    sizes.forEach(size=>{
      const count=Math.max(0,Math.floor(Number(source[size])||0));
      product.stock[size]=count;
      product.tallas[size]=count>0;
    });
  }

  const style=document.createElement('style');
  style.id='haki-inventory-and-menu-fixes';
  style.textContent=`
    .category-menu nav a,.category-menu .menu-nav-button{position:relative!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;padding-right:0!important}
    .category-menu nav a>span[aria-hidden="true"],.category-menu .menu-nav-button>span[aria-hidden="true"]{position:absolute!important;left:190px!important;top:50%!important;transform:translateY(-50%)!important;width:22px!important;display:grid!important;place-items:center!important;margin:0!important;line-height:1!important}
    .size-option[data-stock-count],.detail-size[data-stock-count]{min-width:48px!important;padding-left:7px!important;padding-right:7px!important;white-space:nowrap!important}
    @media(max-width:460px){.size-option[data-stock-count]{min-width:42px!important;font-size:8px!important;padding-left:4px!important;padding-right:4px!important}.category-menu nav a>span[aria-hidden="true"],.category-menu .menu-nav-button>span[aria-hidden="true"]{left:180px!important}}
  `;
  document.head.append(style);

  function polish(data){
    if(!data||typeof data!=='object')return data;
    data.config ||= {};
    if(Array.isArray(data.config.colecciones)){
      data.config.colecciones.forEach(collection=>{
        const name=norm(collection?.nombre);
        if(collection?.id==='collection-4') collection.nombre='Oversized';
        if(name==='camisas, centros'||name==='camisas centros') collection.nombre='Camisas y Centros';
      });
    }
    if(Array.isArray(data.products)){
      data.products.forEach(product=>{
        if(!product||typeof product!=='object')return;
        product.codigo=upper(product.codigo);
        product.nombre=upper(product.nombre);
        applyInventory(product);
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

  function productByCode(code){
    return (window.HAKI_PRODUCTOS||[]).find(product=>upper(product.codigo)===upper(code));
  }

  function decorateStockCounts(){
    document.querySelectorAll('.size-option[data-code][data-size]').forEach(button=>{
      const product=productByCode(button.dataset.code);
      const size=button.dataset.size;
      if(!product?.stock||!Number.isFinite(Number(product.stock[size])))return;
      const count=Math.max(0,Number(product.stock[size])||0);
      const text=`${size} · ${count}`;
      if(button.textContent.trim()!==text) button.textContent=text;
      button.dataset.stockCount=String(count);
      button.title=`Talla ${size}: ${count} disponible${count===1?'':'s'}`;
    });

    let detailCode='';
    try{const hash=decodeURIComponent(location.hash.slice(1));if(hash.startsWith('producto/'))detailCode=hash.slice(9);}catch{}
    const detailProduct=detailCode?productByCode(detailCode):null;
    document.querySelectorAll('.detail-size[data-detail-size]').forEach(button=>{
      const size=button.dataset.detailSize;
      if(!detailProduct?.stock||!Number.isFinite(Number(detailProduct.stock[size])))return;
      const count=Math.max(0,Number(detailProduct.stock[size])||0);
      const text=`${size} · ${count}`;
      if(button.textContent.trim()!==text) button.textContent=text;
      button.dataset.stockCount=String(count);
      button.title=`Talla ${size}: ${count} disponible${count===1?'':'s'}`;
    });
  }

  window.HAKI_INITIAL_STOCK=initialStock;
  window.hakiApplyInventory=products=>{ if(Array.isArray(products)) products.forEach(applyInventory); return products; };

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

  let stockDecorating=false;
  const observer=new MutationObserver(()=>{
    if(stockDecorating)return;
    stockDecorating=true;
    requestAnimationFrame(()=>{decorateStockCounts();stockDecorating=false;});
  });

  window.addEventListener('DOMContentLoaded',()=>{
    decorateStockCounts();
    observer.observe(document.body,{subtree:true,childList:true});
    refresh();
    setInterval(refresh,60000);
  });
  window.addEventListener('hashchange',()=>requestAnimationFrame(decorateStockCounts));
  window.addEventListener('haki:catalog-updated',()=>requestAnimationFrame(decorateStockCounts));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
