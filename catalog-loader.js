// Render the bundled/cached catalog immediately, refresh current data in the background.
(() => {
  const key='haki_catalog_cache_v2';
  const valid=d=>d&&d.config&&typeof d.config==='object'&&Array.isArray(d.products)&&d.products.every(p=>p&&typeof p.codigo==='string'&&typeof p.nombre==='string');
  try { const cached=JSON.parse(localStorage.getItem(key)); if(valid(cached)){window.HAKI_CONFIG=cached.config;window.HAKI_PRODUCTOS=cached.products;} }catch{}
  let busy=false;
  async function refresh(){
    if(busy||document.hidden)return;busy=true;
    try{
      const response=await fetch('https://raw.githubusercontent.com/henmario99-art/HAKI/main/productos.js?v='+Math.floor(Date.now()/60000),{signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw new Error('Catalog unavailable');
      const source=await response.text();
      const a=source.match(/window\.HAKI_CONFIG\s*=\s*(\{[\s\S]*?\});\s*window\.HAKI_PRODUCTOS/),b=source.match(/window\.HAKI_PRODUCTOS\s*=\s*(\[[\s\S]*\]);\s*$/);
      if(!a||!b)return;
      const data={config:JSON.parse(a[1]),products:JSON.parse(b[1])};if(!valid(data))return;
      const changed=JSON.stringify(data)!==JSON.stringify({config:window.HAKI_CONFIG,products:window.HAKI_PRODUCTOS});
      try{localStorage.setItem(key,JSON.stringify(data));}catch{}
      if(changed){window.HAKI_CONFIG=data.config;window.HAKI_PRODUCTOS=data.products;window.dispatchEvent(new Event('haki:catalog-updated'));}
    }catch{/* Keep the usable local catalog when the network is slow/offline. */}finally{busy=false;}
  }
  window.addEventListener('DOMContentLoaded',()=>{refresh();setInterval(refresh,60000);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
