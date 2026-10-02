/* The published catalogue always starts from the current production data. */
(() => {
  const edge='https://uysfqzlihiosebqzvfrl.supabase.co/functions/v1/haki-operations';
  const key='haki_online_catalog_definitivo_v1';
  let busy=false, revision='';
  window.HAKI_STANDALONE=false;
  window.HAKI_COVER_WAITING_LIVE=true;
  window.HAKI_CATALOG_READY=false;
  window.HAKI_ASSET=value=>String(value||'');
  window.hakiImage=window.HAKI_ASSET;
  window.hakiSrcset=()=>'';
  window.HAKI_CONFIG={};
  window.HAKI_PRODUCTOS=[];
  const valid=data=>data&&typeof data.config==='object'&&data.config&&Array.isArray(data.products);
  function apply(data,live){
    if(!valid(data))throw Error('Catálogo no disponible');
    const next=JSON.stringify(data);
    window.HAKI_COVER_WAITING_LIVE=false;
    window.HAKI_CATALOG_READY=true;
    if(next!==revision){
      revision=next;
      window.HAKI_CONFIG=data.config;
      window.HAKI_PRODUCTOS=data.products;
      window.HAKITheme.configure(data.config.tema);
      window.dispatchEvent(new CustomEvent('haki:catalog-updated',{detail:{live}}));
    }
  }
  // A cache from this online version may be used during a temporary outage.
  try{const data=JSON.parse(localStorage.getItem(key)||'null');if(valid(data))apply(data,false);}catch{}
  async function request(url){
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Catálogo no disponible');
    const data=await response.json();if(!valid(data))throw Error('Catálogo no disponible');return data;
  }
  async function refresh(){
    if(busy||document.hidden)return;
    busy=true;
    try{
      let data;
      try{data=await request(edge+'?mode=public-catalog');}
      catch{data=await request('/.netlify/functions/public-catalog');}
      apply(data,true);
      try{localStorage.setItem(key,JSON.stringify(data));}catch{}
    }catch{
      window.HAKI_COVER_WAITING_LIVE=false;
      window.dispatchEvent(new CustomEvent('haki:catalog-updated',{detail:{live:false}}));
    }finally{busy=false;}
  }
  window.HAKIRefreshCatalog=refresh;
  document.addEventListener('DOMContentLoaded',()=>{refresh();setInterval(refresh,60000);});
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',refresh);
})();
