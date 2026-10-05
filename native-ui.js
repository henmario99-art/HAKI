/* Visual-only helpers: never synthesize clicks, requests, navigation or data writes. */
(() => {
  if (window.HAKI_UI) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const loading = new WeakMap(), motions = new WeakMap(), running = new Set();
  const controls = 'button,a[href],summary,select,[role="button"],.color-swatch,.haki-tappable';
  const held = new Map(), pressure = new WeakMap();
  function release(id) {
    const item = held.get(id);
    if (!item) return;
    held.delete(id);
    if (![...held.values()].some(other => other.el === item.el)) {
      item.el.classList.remove('haki-pressed');
      if(!reduced.matches && item.el.animate && CSS.supports('scale','1')) {
        pressure.get(item.el)?.cancel();
        const a=item.el.animate([{scale:'.98'},{scale:'1'}],{duration:140,easing:'cubic-bezier(.2,.8,.2,1)'});pressure.set(item.el,a);running.add(a);a.finished.catch(()=>{}).finally(()=>running.delete(a));
      }
    }
  }
  function releaseAll() { for (const id of [...held.keys()]) release(id); }
  function target(event) {
    const el = event.target?.closest?.(controls);
    return el && !el.matches(':disabled,[aria-disabled="true"]') && !el.closest('[inert]') ? el : null;
  }
  document.addEventListener('pointerdown', event => {
    if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
    const el = target(event); if (!el) return;
    release(event.pointerId);
    pressure.get(el)?.cancel();
    el.classList.add('haki-touch-target','haki-pressed');
    held.set(event.pointerId,{el,x:event.clientX,y:event.clientY});
  }, {capture:true,passive:true});
  document.addEventListener('pointermove', event => {
    const item = held.get(event.pointerId);
    if (item && Math.hypot(event.clientX-item.x,event.clientY-item.y)>10) release(event.pointerId);
  }, {capture:true,passive:true});
  for (const name of ['pointerup','pointercancel','lostpointercapture']) document.addEventListener(name,e=>release(e.pointerId),{capture:true,passive:true});
  document.addEventListener('keydown',event=>{
    if (event.repeat || !['Enter',' '].includes(event.key) || !event.target?.matches?.('button,a[href],summary,[role="button"]')) return;
    const el=target(event); if(!el)return;
    pressure.get(el)?.cancel();el.classList.add('haki-touch-target','haki-pressed'); held.set('keyboard',{el});
  });
  document.addEventListener('keyup',()=>release('keyboard'));
  window.addEventListener('blur',releaseAll);
  window.addEventListener('pagehide',releaseAll);
  document.addEventListener('scroll',releaseAll,{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});

  function reveal(el) {
    if(!el)return;
    motions.get(el)?.cancel();
    if(reduced.matches || !el.animate || el.hidden)return;
    const a=el.animate([{opacity:.7,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'cubic-bezier(.2,.8,.2,1)'});
    motions.set(el,a);running.add(a);
    a.finished.catch(()=>{}).finally(()=>{running.delete(a);if(motions.get(el)===a)motions.delete(el);});
  }
  reduced.addEventListener('change',()=>{for(const a of running)a.cancel();running.clear();});
  function block(cls='') { const el=document.createElement('span');el.className='haki-skeleton-block '+cls;return el; }
  function skeleton(kind,count) {
    const list=document.createElement('div');list.className='haki-skeleton-list';list.dataset.shape=kind;list.setAttribute('aria-hidden','true');
    for(let i=0;i<count;i++){
      const card=document.createElement('div');card.className='haki-skeleton-card';card.dataset.shape=kind;
      if(kind==='admin')card.append(block('round'));
      if(['products','inventory','detail'].includes(kind))card.append(block('photo'));
      const copy=document.createElement('div');copy.className='haki-skeleton-copy';copy.append(block(),block('short'));card.append(copy);
      if(['admin','days'].includes(kind))card.append(block('short'));
      if(kind==='inventory'){const stock=document.createElement('div');stock.className='haki-skeleton-stock';for(let j=0;j<4;j++)stock.append(block());card.append(stock);}
      list.append(card);
    }
    return list;
  }
  function begin(el,kind='rows',count=4,{reset=false,metrics=[]}={}) {
    if(!el)return ()=>{};
    // New requests own their placeholders; obsolete responses cannot clear them.
    const previous=loading.get(el);if(previous)previous.finish(false);
    if(reset)el.replaceChildren();
    const token={node:null,frame:null,busy:el.getAttribute('aria-busy'),metrics:metrics.filter(Boolean),shown:false};
    loading.set(el,token);el.setAttribute('aria-busy','true');
    token.frame=requestAnimationFrame(()=>{
      if(loading.get(el)!==token)return;
      if(!el.children.length){token.node=skeleton(kind,count);el.append(token.node);token.shown=true;}
      if(token.shown)token.metrics.forEach(metric=>metric.setAttribute('data-haki-metric-pending',''));
    });
    token.finish=(success=true)=>{
      if(loading.get(el)!==token)return;
      cancelAnimationFrame(token.frame);token.node?.remove();
      token.metrics.forEach(metric=>metric.removeAttribute('data-haki-metric-pending'));
      if(token.busy===null)el.removeAttribute('aria-busy');else el.setAttribute('aria-busy',token.busy);
      loading.delete(el);
      if(!success && token.shown && !el.children.length){const msg=document.createElement('p');msg.className='suite-empty';msg.textContent='No se pudo cargar. Vuelve a entrar a esta sección para intentarlo de nuevo.';el.append(msg);}
      if(success && token.shown)reveal(el);
    };
    return token.finish;
  }
  window.HAKI_UI={begin,reveal,end:(el,success=true)=>loading.get(el)?.finish(success)};

  // Observe only changed subtrees; no polling, image wrapping or gallery restructuring.
  const imageSelector='.product-image img,.collection-image img,#detailGallery img,.detail-color-option img,#heroImage';
  const failed=new WeakMap(),seen=new WeakSet();
  function imageState(img) {
    if(!img?.matches(imageSelector))return;
    const src=img.getAttribute('src')||'';
    const pending=!(img.complete&&img.naturalWidth>0) && failed.get(img)!==src && (!!src || (img.id==='heroImage'&&window.HAKI_COVER_WAITING_LIVE));
    const was=img.hasAttribute('data-haki-image-pending');
    img.toggleAttribute('data-haki-image-pending',pending);
    const frame=img.closest('.product-image,.collection-image,.hero-photo');
    if(frame){frame.classList.add('haki-image-frame');frame.toggleAttribute('data-haki-image-pending',pending);}
    if(was&&!pending&&img.naturalWidth>0&&!reduced.matches&&img.animate){const a=img.animate([{opacity:.55},{opacity:1}],{duration:140});running.add(a);a.finished.catch(()=>{}).finally(()=>running.delete(a));}
    if(!seen.has(img)){
      seen.add(img);
      img.addEventListener('load',()=>{failed.delete(img);imageState(img);});
      img.addEventListener('error',()=>{failed.set(img,img.getAttribute('src')||'');imageState(img);});
    }
  }
  function scan(node) {
    if(node.nodeType!==1)return;
    if(node.tagName==='IMG')imageState(node);
    node.querySelectorAll?.(imageSelector).forEach(imageState);
  }
  new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='attributes')imageState(record.target);
      else record.addedNodes.forEach(scan);
    }
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src','srcset']});
  function ready(){
    scan(document.documentElement);
    // Put empty-catalog placeholders beside the lists, preserving their cached DOM fragments.
    if(document.getElementById('catalogo') && !(window.HAKI_PRODUCTOS||[]).length && window.HAKI_COVER_WAITING_LIVE){
      document.body.setAttribute('data-haki-catalog-pending','');
      const pending=['products','newProducts'].map(id=>{
        const el=document.getElementById(id);if(!el)return null;
        const holder=document.createElement('div');el.before(holder);
        return {holder,finish:begin(holder,'products',4)};
      }).filter(Boolean);
      const changed=()=>{
        const success=window.HAKI_CATALOG_READY!==false;
        pending.forEach(item=>{item.finish(success);if(success)item.holder.remove();});
        imageState(document.getElementById('heroImage'));
        if(success){document.body.removeAttribute('data-haki-catalog-pending');window.removeEventListener('haki:catalog-updated',changed);}
      };
      window.addEventListener('haki:catalog-updated',changed);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
