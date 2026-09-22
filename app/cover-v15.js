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

    if(hero){
      const primary=config.portada||config.portadaRespaldo||'';
      const fallback=config.portadaRespaldo||'';
      const target=imageUrl(primary);
      if(target && hero.getAttribute('src')!==target) hero.setAttribute('src',target);
      const srcset=typeof window.hakiSrcset==='function' ? window.hakiSrcset(primary) : '';
      if(srcset){
        hero.setAttribute('srcset',srcset);
        hero.setAttribute('sizes','100vw');
      }else{
        hero.removeAttribute('srcset');
        hero.removeAttribute('sizes');
      }
      hero.onerror=()=>{
        hero.onerror=null;
        const backup=imageUrl(fallback);
        if(backup) hero.src=backup;
      };
      hero.setAttribute('fetchpriority','high');
      hero.setAttribute('decoding','async');
    }

    if(title && !title.querySelector('.hero-brand-icon')){title.textContent='HAKI';title.setAttribute('aria-label','HAKI');}
    if(desc) desc.textContent='Haki | Anime & Sports | El Salvador';
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
