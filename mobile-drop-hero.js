(() => {
  function setup() {
    const hero=document.getElementById('homeHero');
    if(!hero||hero.querySelector('.mobile-cover-carousel'))return;
    const mobile=matchMedia('(max-width:800px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
    const covers=[{id:'disponible',name:'Disponible'},{id:'onyx',name:'Colección Onyx'},{id:'bat',name:'Colección Bat'}];
    const carousel=document.createElement('section');
    carousel.className='mobile-cover-carousel';
    carousel.setAttribute('aria-label','Portadas HAKI');
    carousel.setAttribute('aria-roledescription','carrusel');
    const controls=document.createElement('div'),dots=document.createElement('div'),status=document.createElement('span');
    controls.className='mobile-cover-controls';dots.className='mobile-cover-dots';dots.setAttribute('aria-label','Elegir portada');
    status.className='sr-only';status.setAttribute('aria-live','polite');
    let current=0,rotating=!reduced.matches,animationRunning=!reduced.matches,visible=true,fallbackTimer=0,lastSwipe=0,fallbackProgress=0;
    const slides=covers.map((cover,i)=>{
      const panel=document.createElement('div'),image=document.createElement('img'),video=document.createElement('video'),buy=document.createElement('a'),dot=document.createElement('button');
      panel.className='mobile-cover-slide';panel.id='mobile-cover-'+cover.id;panel.hidden=i!==0;
      panel.setAttribute('role','group');panel.setAttribute('aria-roledescription','diapositiva');panel.setAttribute('aria-label',(i+1)+' de 3: '+cover.name);
      image.alt=cover.name;image.width=1080;image.height=1350;image.decoding='async';
      video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='none';
      video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-hidden','true');
      video.addEventListener('playing',()=>panel.classList.add('is-playing'));
      video.addEventListener('ended',()=>{if(current===i){if(rotating&&canRun())activate((i+1)%3);else{animationRunning=false;}}});
      video.addEventListener('timeupdate',()=>{if(current===i&&video.duration>0)dot.style.setProperty('--cover-offset',String(Math.max(0,100*(1-video.currentTime/video.duration))));});
      video.addEventListener('error',()=>{panel.classList.remove('is-playing');if(current===i)scheduleFallback();});
      buy.className='mobile-cover-buy';buy.href='#nuevo-drop';buy.setAttribute('aria-label','Comprar — '+cover.name);
      panel.append(image,video,buy);carousel.append(panel);
      dot.type='button';dot.setAttribute('aria-label','Ver portada '+(i+1)+': '+cover.name);dot.setAttribute('aria-controls',panel.id);dot.setAttribute('aria-pressed',String(i===0));dot.innerHTML='<span></span><svg class="cover-progress" viewBox="0 0 10 10" aria-hidden="true"><g transform="rotate(-90 5 5)"><circle cx="5" cy="5" r="3.8" pathLength="100"/></g></svg>';
      dot.addEventListener('click',()=>{rotating=!reduced.matches;animationRunning=!reduced.matches;activate(i,true);});dots.append(dot);
      return {panel,image,video,dot,cover};
    });
    controls.append(dots,status);carousel.append(controls);hero.append(carousel);
    const scroll=document.createElement('button');
    scroll.className='mobile-hero-scroll';scroll.type='button';scroll.setAttribute('aria-label','Seguir explorando el catálogo');
    scroll.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 9 7 7 7-7"/></svg>';
    scroll.addEventListener('click',()=>{
      const next=['novedades','collectionsSection','catalogo'].map(id=>document.getElementById(id)).find(el=>el&&el.getClientRects().length);
      const masthead=document.querySelector('.header')?.getBoundingClientRect().height||64;
      window.scrollTo({top:Math.max(0,(next||hero).getBoundingClientRect().top+scrollY-masthead),behavior:reduced.matches?'auto':'smooth'});
    });hero.append(scroll);
    function canRun(){return mobile.matches&&animationRunning&&visible&&!document.hidden;}
    function scheduleFallback(){clearTimeout(fallbackTimer);clearInterval(fallbackProgress);if(rotating&&canRun()){const started=performance.now();fallbackProgress=setInterval(()=>slides[current].dot.style.setProperty('--cover-offset',String(Math.max(0,100*(1-(performance.now()-started)/5000)))),100);fallbackTimer=setTimeout(()=>activate((current+1)%3),5000);}}
    function playCurrent(){
      clearTimeout(fallbackTimer);clearInterval(fallbackProgress);const item=slides[current];
      if(!canRun()){item.video.pause();return;}
      if(!item.video.getAttribute('src'))item.video.src='/videos/mobile-'+item.cover.id+'-v1.mp4';
      if(item.video.ended)item.video.currentTime=0;
      item.video.play().catch(()=>{if(item===slides[current]&&canRun()){item.panel.classList.remove('is-playing');scheduleFallback();}});
    }
    function activate(index,announce=false){
      clearTimeout(fallbackTimer);clearInterval(fallbackProgress);
      slides.forEach((item,i)=>{item.video.pause();item.panel.hidden=i!==index;item.dot.setAttribute('aria-pressed',String(i===index));item.dot.style.setProperty('--cover-offset','100');if(i!==index)item.panel.classList.remove('is-playing');});
      current=index;const item=slides[index];
      if(!item.image.getAttribute('src'))item.image.src='/images/mobile-carousel/'+item.cover.id+'-v1.png';
      if(item.video.readyState)item.video.currentTime=0;
      if(announce)status.textContent=(index+1)+' de 3: '+item.cover.name;
      playCurrent();
    }
    carousel.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();rotating=false;animationRunning=!reduced.matches;
      const next=event.key==='Home'?0:event.key==='End'?2:(current+(event.key==='ArrowRight'?1:2))%3;
      activate(next,true);slides[next].dot.focus({preventScroll:true});
    });
    let touch=null;
    carousel.addEventListener('touchstart',event=>{clearTimeout(fallbackTimer);clearInterval(fallbackProgress);touch={x:event.touches[0].clientX,y:event.touches[0].clientY};slides[current].video.pause();},{passive:true});
    carousel.addEventListener('touchend',event=>{
      if(!touch)return;
      const dx=event.changedTouches[0].clientX-touch.x,dy=event.changedTouches[0].clientY-touch.y;touch=null;
      if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){lastSwipe=Date.now();rotating=!reduced.matches;animationRunning=!reduced.matches;activate((current+(dx<0?1:2))%3,true);}else playCurrent();
    },{passive:true});
    carousel.addEventListener('touchcancel',()=>{touch=null;playCurrent();},{passive:true});
    carousel.addEventListener('click',event=>{if(Date.now()-lastSwipe<400){event.preventDefault();event.stopPropagation();}},true);
    carousel.addEventListener('focusin',event=>{if(!dots.contains(event.target)){rotating=false;animationRunning=false;playCurrent();}});
    document.addEventListener('visibilitychange',playCurrent);
    if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);playCurrent();},{threshold:.1}).observe(carousel);
    function syncViewport(){
      hero.classList.toggle('mobile-drop-hero',mobile.matches);
      if(mobile.matches)activate(current);else{clearTimeout(fallbackTimer);clearInterval(fallbackProgress);slides.forEach(item=>item.video.pause());}
    }
    mobile.addEventListener('change',syncViewport);
    reduced.addEventListener('change',()=>{animationRunning=!reduced.matches;rotating=animationRunning;playCurrent();});
    syncViewport();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
