(()=>{
  const getConfig=()=>window.HAKI_CONFIG||{};
  const imageUrl=url=>{
    if(!url) return '';
    return typeof window.hakiImage==='function'
      ? window.hakiImage(url, matchMedia('(max-width:800px)').matches ? 1280 : 1920)
      : url;
  };
  const applyCover=()=>{
    const config=getConfig();
    const hero=document.getElementById('heroImage');
    const title=document.getElementById('heroTitle');
    const desc=document.getElementById('heroDescription');
    const search=document.getElementById('desktopSearch');
    const b1=document.getElementById('heroButton1');
    const b2=document.getElementById('heroButton2');

    if(window.HAKI_COVER_WAITING_LIVE){
      if(hero){
        hero.removeAttribute('src');
        hero.removeAttribute('srcset');
        hero.style.visibility='hidden';
      }
      return;
    }

    if(window.HAKI_COVER){
      window.HAKI_COVER.paint(hero,config);
    }else if(hero){
      const primary=config.portadaOriginal||config.portadaDesktop||config.portada||config.portadaRespaldo||'';
      const fallback=config.portadaRespaldo||'';
      const variants=[
        [config.portadaMobile,1080],
        [config.portadaTablet,1600],
        [config.portadaDesktop,2560],
        [config.portada,3200],
      ].filter(([url])=>String(url||'').trim());
      const unique=variants.filter(([url],index,list)=>list.findIndex(([candidate])=>candidate===url)===index);
      const target=config.portadaOriginal||config.portadaDesktop||imageUrl(primary);
      if(target&&hero.getAttribute('src')!==target) hero.setAttribute('src',target);
      const responsive=unique.length>1?unique.map(([url,width])=>`${url} ${width}w`).join(', '):'';
      const srcset=responsive||(typeof window.hakiSrcset==='function'?window.hakiSrcset(primary):'');
      if(srcset){
        hero.setAttribute('srcset',srcset);
        hero.setAttribute('sizes','100vw');
      }else{
        hero.removeAttribute('srcset');
        hero.removeAttribute('sizes');
      }
      hero.onerror=()=>{
        hero.onerror=null;
        hero.removeAttribute('srcset');
        const backup=imageUrl(fallback);
        if(backup) hero.src=backup;
      };
      hero.setAttribute('fetchpriority','high');
      hero.setAttribute('decoding','async');
      hero.style.visibility='';
    }

    if(title){
      title.replaceChildren();
      title.hidden=true;
      title.setAttribute('aria-hidden','true');
    }
    if(desc){
      desc.textContent='';
      desc.hidden=true;
      desc.setAttribute('aria-hidden','true');
    }
    if(search){search.placeholder='BUSCAR PRENDA...';search.setAttribute('aria-label','Buscar prenda');}
    if(b1){b1.classList.add('solid');b1.classList.remove('outline');b1.dataset.heroStyle='blanco';}
    if(b2){b2.classList.add('outline');b2.classList.remove('solid');b2.dataset.heroStyle='transparente';}
  };
  const queue=()=>requestAnimationFrame(()=>requestAnimationFrame(applyCover));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});
  else queue();
  window.addEventListener('load',applyCover,{once:true});
  window.addEventListener('haki:catalog-updated',queue);
  window.addEventListener('pageshow',queue);
})();
