(() => {
  const mobile = matchMedia('(max-width:800px)');
  const $ = (selector, parent=document) => parent.querySelector(selector);
  const $$ = (selector, parent=document) => [...parent.querySelectorAll(selector)];
  const shapes = {
    Instagram:'<rect x="5" y="5" width="14" height="14" rx="4"/><circle cx="12" cy="12" r="3.4"/><circle cx="16.8" cy="7.4" r=".8" fill="white" stroke="none"/>',
    WhatsApp:'<path d="M4 20l1-4a8 8 0 1 1 3 3z"/><path d="M9 7c-1 1-1 3 1 5s4 3 5 2l1-2-3-1-1 1-2-2 1-1z"/>',
    Facebook:'<path d="M14.5 21v-8h2.8l.5-3.3h-3.3V7.6c0-.9.5-1.6 1.7-1.6H18V3.1A23 23 0 0 0 15.5 3C12.9 3 11 4.6 11 7.4v2.3H8V13h3v8" fill="white" stroke="none"/>',
    TikTok:'<path d="M14 3h3c.2 2.3 1.5 3.7 4 4v3a9 9 0 0 1-4-1.2v7a5.5 5.5 0 1 1-5.5-5.5v3a2.5 2.5 0 1 0 2.5 2.5z" fill="white" stroke="none"/>'
  };
  let scheduled=false;
  function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;polish();});}
  function create(tag, className, text){const n=document.createElement(tag);if(className)n.className=className;if(text)n.textContent=text;return n;}
  function cloneLink(source){const clone=source.cloneNode(true);clone.removeAttribute('id');return clone;}
  function setupFooter(){
    const footer=$('footer.footer');if(!footer||$('.haki-mobile-footer',footer))return;
    const shell=create('div','haki-mobile-footer');
    const legal=$$('.haki-legal-links a',footer);
    for(const [title,links] of [
      ['Ayuda',[...$$('.footer-service-links a',footer),...legal.slice(3)]],
      ['Información',legal.slice(0,3)]
    ]){
      const details=create('details');details.append(create('summary','',title));
      const nav=create('nav','haki-mobile-footer-panel');nav.setAttribute('aria-label',title);
      links.forEach(link=>nav.append(cloneLink(link)));
      if(title==='Información'){
        const original=$('[data-privacy-open]',footer);
        if(original){const button=cloneLink(original);button.removeAttribute('data-privacy-open');button.addEventListener('click',()=>original.click());nav.append(button);}
      }
      details.append(nav);shell.append(details);
      details.addEventListener('toggle',()=>{if(details.open)$$('details',shell).forEach(other=>{if(other!==details)other.open=false;});});
    }
    const socials=create('nav','haki-mobile-socials');socials.setAttribute('aria-label','Redes sociales de HAKI');
    for(const label of Object.keys(shapes)){
      const original=$('#'+label.toLowerCase()+'Footer');if(!original)continue;
      const link=cloneLink(original);link.dataset.mobileSocial=original.id;link.setAttribute('aria-label',label);
      link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+shapes[label]+'</svg>';socials.append(link);
    }
    shell.append(socials);
    const policies=create('nav','haki-mobile-legal');policies.setAttribute('aria-label','Políticas de HAKI');
    legal.slice(0,3).forEach(link=>policies.append(cloneLink(link)));shell.append(policies);
    const brand=create('a','haki-mobile-wordmark');brand.href='#top';brand.setAttribute('aria-label','HAKI inicio');
    const logo=create('img');logo.src='/images/haki-wordmark.svg';logo.alt='HAKI';logo.width=110;logo.height=36;brand.append(logo);shell.append(brand);
    shell.append(create('p','haki-mobile-signature','HAKI SPORTSWEAR - EL SALVADOR'));footer.append(shell);
  }
  function syncSocials(){
    $$('[data-mobile-social]').forEach(link=>{
      const original=document.getElementById(link.dataset.mobileSocial);const href=original?.getAttribute('href');
      if(href)link.href=href;link.hidden=!href||original.hidden;
    });
  }
  function arrows(section,rail){
    if(!section||!rail||rail.dataset.mobileArrows)return;
    rail.dataset.mobileArrows='true';
    const buttons=['previous','next'].map(direction=>{
      const button=create('button','haki-mobile-rail-arrow');button.type='button';button.dataset.direction=direction;
      button.setAttribute('aria-label',(direction==='next'?'Siguiente':'Anterior')+' en '+(rail.id==='collectionsGrid'?'categorías':'últimas prendas'));
      button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(direction==='next'?'M9 5L16 12L9 19':'M15 5L8 12L15 19')+'"/></svg>';
      button.addEventListener('click',()=>{
        const first=rail.firstElementChild;const gap=parseFloat(getComputedStyle(rail).columnGap)||0;
        rail.scrollBy({left:(direction==='next'?1:-1)*((first?.getBoundingClientRect().width||rail.clientWidth)+gap),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
      });section.append(button);return button;
    });
    const update=()=>{buttons[0].hidden=rail.scrollLeft<=2;buttons[1].hidden=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-2;};
    rail.addEventListener('scroll',update,{passive:true});
    if(window.ResizeObserver)new ResizeObserver(update).observe(rail);
    new MutationObserver(update).observe(rail,{childList:true});update();
  }
  function polish(){
    const products=new Map((window.HAKI_PRODUCTOS||[]).map(p=>[p.codigo,p]));
    $$('#collectionsGrid .collection-tile').forEach(tile=>{if(!$('.haki-collection-cta',tile))tile.append(create('span','haki-collection-cta','VER PRENDAS'));});
    $$('article.product[data-code]').forEach(card=>{
      const photo=$('.product-image',card), info=$('.product-info',card);
      if(photo&&!$('.haki-mobile-product-open',photo)){const plus=create('span','haki-mobile-product-open','+');plus.setAttribute('aria-hidden','true');photo.append(plus);}
      const product=products.get(card.dataset.code);const color=(Array.isArray(product?.colores)?product.colores[0]:'') || String(product?.nombre||'').match(/\b(Negro|Azul|Blanco|Rojo|Morado|Gris|Verde|Negra|Blanca|Roja|Morada)\b/i)?.[0]?.toLocaleLowerCase('es-SV').replace(/^./,c=>c.toUpperCase()) || '';
      let label=$('.haki-card-color',card);
      if(color&&info){if(!label){label=create('p','haki-card-color');$('strong',info)?.before(label);}if(label)label.textContent=color;}
    });
    setupFooter();syncSocials();
    arrows($('#collectionsSection'),$('#collectionsGrid'));arrows($('#latestSection'),$('#latestProducts'));
  }
  function setup(){
    // Legacy inline sheets move into body at DOMContentLoaded; keep this scoped sheet last.
    const sheet=$('link[data-mobile-storefront]');if(sheet)document.body.append(sheet);
    polish();
    for(const id of ['collectionsGrid','products','newProducts','latestProducts']){
      const rail=document.getElementById(id);if(rail)new MutationObserver(queue).observe(rail,{childList:true});
    }
    window.addEventListener('haki:catalog-updated',queue);mobile.addEventListener('change',queue);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
