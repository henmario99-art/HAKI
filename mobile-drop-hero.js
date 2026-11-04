(() => {
 function setup(){
  const hero=document.getElementById('homeHero');
  if(!hero||hero.querySelector('.mobile-cover-carousel'))return;
  const mobile=matchMedia('(max-width:800px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const covers=[
   {id:'disponible',name:'Disponible',href:'#nuevo-drop',button:[429,827,292,81]},
   {id:'onyx',name:'Colección Onyx',href:'#producto/GSCV1-03',button:[429,827,292,81]},
   {id:'bat',name:'Colección Bat',href:'#producto/BATC-05',button:[429,827,292,81]}
  ];
  const carousel=document.createElement('section'),controls=document.createElement('div'),dots=document.createElement('div'),status=document.createElement('span');
  carousel.className='mobile-cover-carousel';carousel.setAttribute('aria-label','Portadas HAKI');carousel.setAttribute('aria-roledescription','carrusel');
  controls.className='mobile-cover-controls';dots.className='mobile-cover-dots';dots.setAttribute('aria-label','Elegir portada');status.className='sr-only';status.setAttribute('aria-live','polite');
  let current=0,rotating=!reduced.matches,visible=true,touch=null,lastSwipe=0,pending=null,outgoing=false,epoch=0,clock=0,last=0,frame=0,ready=false;
  const slides=covers.map((cover,i)=>{
   const panel=document.createElement('div'),image=document.createElement('img'),buy=document.createElement('a'),graphic=document.createElement('img'),dot=document.createElement('button');
   panel.className='mobile-cover-slide';panel.id='mobile-cover-'+cover.id;panel.hidden=i!==0;panel.setAttribute('role','group');panel.setAttribute('aria-roledescription','diapositiva');panel.setAttribute('aria-label',(i+1)+' de 3: '+cover.name);
   image.alt=cover.name;image.width=1080;image.height=1080;image.decoding='async';
   if(mobile.matches)image.src='/images/mobile-carousel/'+cover.id+'-square-v5.png';
   buy.className='mobile-cover-buy';buy.href=cover.href;buy.setAttribute('aria-label','Comprar — '+cover.name);
   const [x,y,w,h]=cover.button;Object.assign(buy.style,{left:x/1080*100+'%',top:y/1080*100+'%',width:w/1080*100+'%',height:h/1080*100+'%'});
   const pct=value=>value/1080*100+'%';
   // Preserve the supplied PNG pixels. Only its button region is displayed in a separate animated crop.
   image.style.clipPath='polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,'+pct(x)+' '+pct(y)+','+pct(x+w)+' '+pct(y)+','+pct(x+w)+' '+pct(y+h)+','+pct(x)+' '+pct(y+h)+','+pct(x)+' '+pct(y)+',0 0)';
   buy.style.setProperty('--cover-crop-width',1080/w*100+'%');buy.style.setProperty('--cover-crop-height',1080/h*100+'%');buy.style.setProperty('--cover-crop-left',-x/w*100+'%');buy.style.setProperty('--cover-crop-top',-y/h*100+'%');
   if(mobile.matches)graphic.src='/images/mobile-carousel/'+cover.id+'-square-v5.png';graphic.alt='';graphic.width=1080;graphic.height=1080;buy.append(graphic);panel.append(image,buy);carousel.append(panel);
   dot.type='button';dot.setAttribute('aria-label','Ver portada '+(i+1)+': '+cover.name);dot.setAttribute('aria-controls',panel.id);dot.setAttribute('aria-pressed',String(i===0));
   dot.innerHTML='<span></span><svg class="cover-progress" viewBox="0 0 10 10" aria-hidden="true"><g transform="rotate(-90 5 5)"><circle cx="5" cy="5" r="3.8" pathLength="100"/></g></svg>';
   dot.addEventListener('click',()=>{rotating=!reduced.matches;request(i,true);});dots.append(dot);
   return {panel,image,buy,graphic,dot,cover};
  });
  controls.append(dots,status);carousel.append(controls);hero.append(carousel);
  const scroll=document.createElement('button');scroll.className='mobile-hero-scroll';scroll.type='button';scroll.setAttribute('aria-label','Seguir explorando el catálogo');scroll.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 9 7 7 7-7"/></svg>';
  scroll.addEventListener('click',()=>{const next=['novedades','collectionsSection','catalogo'].map(id=>document.getElementById(id)).find(el=>el&&el.getClientRects().length);const masthead=document.querySelector('.header')?.getBoundingClientRect().height||64;window.scrollTo({top:Math.max(0,(next||hero).getBoundingClientRect().top+scrollY-masthead),behavior:reduced.matches?'auto':'smooth'});});hero.append(scroll);
  function canRun(){return mobile.matches&&visible&&!document.hidden&&!touch&&!reduced.matches;}
  function cancel(){cancelAnimationFrame(frame);frame=0;last=0;ready=false;}
  function syncPlayback(){cancelAnimationFrame(frame);frame=0;last=0;if(canRun()&&ready)frame=requestAnimationFrame(tick);}
  function staticButton(){cancel();outgoing=false;pending=null;const s=slides[current];s.panel.style.opacity='1';s.buy.style.opacity='1';s.buy.style.transform='translateY(0)';}
  function render(){
   const s=slides[current],enter=Math.max(0,Math.min(1,(clock-450)/500)),exit=Math.max(0,Math.min(1,(clock-4700)/300));
   s.panel.style.opacity=String(Math.min(1,clock/300)*(1-Math.max(0,Math.min(1,(clock-5000)/200))));
   s.buy.style.opacity=String(enter*(1-exit));
   s.buy.style.transform='translateY('+(clock<950?75*Math.pow(1-enter,2):75*exit*exit)+'%)';
   s.dot.style.setProperty('--cover-offset',String(Math.max(0,100*(1-clock/5200))));
  }
  function tick(now){
   if(!canRun()||!ready){last=0;return;}
   if(last)clock+=Math.min(now-last,100);last=now;
   if(!rotating&&!pending&&clock>=4700){staticButton();return;}
   if(clock>=5200){const next=pending||{index:(current+1)%3,announce:false};activate(next.index,next.announce);return;}
   render();frame=requestAnimationFrame(tick);
  }
  function request(index,announce=false){
   if(index===current&&!pending)return;
   pending={index,announce};
   if(reduced.matches||!canRun()||!ready){activate(index,announce);return;}
   clock=Math.max(clock,4700);syncPlayback();
  }
  function activate(index,announce=false){
   const token=++epoch;cancel();pending=null;outgoing=false;current=index;clock=0;
   slides.forEach((s,i)=>{s.panel.hidden=i!==index;s.panel.style.opacity='0';s.buy.style.opacity='0';s.buy.style.transform='translateY(75%)';s.dot.setAttribute('aria-pressed',String(i===index));});
   const s=slides[index];
   if(!s.image.getAttribute('src'))s.image.src='/images/mobile-carousel/'+s.cover.id+'-square-v5.png';
   if(!s.graphic.getAttribute('src'))s.graphic.src='/images/mobile-carousel/'+s.cover.id+'-square-v5.png';
   if(announce)status.textContent=(index+1)+' de 3: '+s.cover.name;
   if(reduced.matches){staticButton();return;}
   Promise.all([s.image.decode().catch(()=>{}),s.graphic.decode().catch(()=>{})]).then(()=>{
    if(token!==epoch||!mobile.matches)return;
    ready=true;render();syncPlayback();
   });
  }
  carousel.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();rotating=false;const next=event.key==='Home'?0:event.key==='End'?2:(current+(event.key==='ArrowRight'?1:2))%3;request(next,true);slides[next].dot.focus({preventScroll:true});});
  carousel.addEventListener('touchstart',event=>{touch={x:event.touches[0].clientX,y:event.touches[0].clientY};syncPlayback();},{passive:true});
  carousel.addEventListener('touchend',event=>{if(!touch)return;const dx=event.changedTouches[0].clientX-touch.x,dy=event.changedTouches[0].clientY-touch.y;touch=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){lastSwipe=Date.now();rotating=!reduced.matches;request((current+(dx<0?1:2))%3,true);}syncPlayback();},{passive:true});
  carousel.addEventListener('touchcancel',()=>{touch=null;syncPlayback();},{passive:true});
  carousel.addEventListener('click',event=>{if(Date.now()-lastSwipe<400){event.preventDefault();event.stopPropagation();}},true);
  carousel.addEventListener('focusin',event=>{if(!dots.contains(event.target)){rotating=false;staticButton();}});
  document.addEventListener('visibilitychange',syncPlayback);
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);syncPlayback();},{threshold:.1}).observe(carousel);
  function syncViewport(){hero.classList.toggle('mobile-drop-hero',mobile.matches);if(mobile.matches)activate(current);else{++epoch;cancel();}}
  mobile.addEventListener('change',syncViewport);reduced.addEventListener('change',()=>{rotating=!reduced.matches;activate(current);});syncViewport();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();