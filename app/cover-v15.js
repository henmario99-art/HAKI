(()=>{
  const COVER='assets/portada-haki-v15.webp';
  const applyCover=()=>{
    const hero=document.getElementById('heroImage');
    const title=document.getElementById('heroTitle');
    const desc=document.getElementById('heroDescription');
    const search=document.getElementById('desktopSearch');
    const b1=document.getElementById('heroButton1');
    const b2=document.getElementById('heroButton2');
    if(hero){
      hero.removeAttribute('srcset');
      hero.removeAttribute('sizes');
      if(hero.getAttribute('src')!==COVER) hero.setAttribute('src',COVER);
      hero.setAttribute('fetchpriority','high');
      hero.setAttribute('decoding','async');
    }
    if(title){title.textContent='HAKI';title.setAttribute('aria-label','HAKI');}
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
