(() => {
  const mobile = matchMedia('(max-width:800px)');
  const $ = (selector, parent=document) => parent.querySelector(selector);
  const $$ = (selector, parent=document) => [...parent.querySelectorAll(selector)];
  const shapes = {
    Instagram:'<rect x="5" y="5" width="14" height="14" rx="4"/><circle cx="12" cy="12" r="3.4"/><circle cx="16.8" cy="7.4" r=".8" fill="currentColor" stroke="none"/>',
    WhatsApp:'<path d="M4 20l1-4a8 8 0 1 1 3 3z"/><path d="M9 7c-1 1-1 3 1 5s4 3 5 2l1-2-3-1-1 1-2-2 1-1z"/>',
    Facebook:'<path d="M14.5 21v-8h2.8l.5-3.3h-3.3V7.6c0-.9.5-1.6 1.7-1.6H18V3.1A23 23 0 0 0 15.5 3C12.9 3 11 4.6 11 7.4v2.3H8V13h3v8" fill="currentColor" stroke="none"/>',
    TikTok:'<path d="M14 3h3c.2 2.3 1.5 3.7 4 4v3a9 9 0 0 1-4-1.2v7a5.5 5.5 0 1 1-5.5-5.5v3a2.5 2.5 0 1 0 2.5 2.5z" fill="currentColor" stroke="none"/>'
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
  function setupInstagram(){
    const latest=$('#latestSection');if(!latest)return;
    let section=$('#hakiInstagramSection');
    if(!section){
      section=create('section');section.id='hakiInstagramSection';section.setAttribute('aria-labelledby','hakiInstagramTitle');
      const title=create('h2');title.id='hakiInstagramTitle';title.append('Más de HAKI,',create('br'),'en Instagram.');
      const card=create('a','haki-instagram-card');card.target='_blank';card.rel='noopener noreferrer';card.dataset.hakiPress='none';
      const head=create('div','haki-instagram-head');
      const avatar=create('span','haki-instagram-avatar');const logo=create('img');logo.src='/images/haki-wordmark.svg';logo.alt='';logo.width=30;logo.height=12;avatar.append(logo);
      const meta=create('div');meta.append(create('strong','','@hakisv1'),create('p','','HAKI Sportswear · El Salvador'));head.append(avatar,meta);
      const photos=create('div','haki-instagram-photos');
      // Static HAKI photographs from the approved design; this card only links to Instagram.
      for(const [source,alt] of [
        ['/images/ONYXV1ROJA.webp','HAKI · camiseta de compresión'],
        ['/images/YLA9.25.25D-BFBATCAVE_SOCIAL_023.jpg','HAKI · camisa de compresión'],
        ['/images/1790039192375-afb42f55-WhatsApp-Image-2026-09-21-at-7.05.59-PM.webp','HAKI · prendas en el gimnasio']
      ]){
        const photo=create('img');photo.src=typeof window.hakiImage==='function'?window.hakiImage(source,400):source;
        photo.alt=alt;photo.width=108;photo.height=140;photo.loading='lazy';photo.decoding='async';
        photo.addEventListener('error',()=>{photo.src='/images/producto.svg';},{once:true});photos.append(photo);
      }
      card.append(head,photos,create('span','haki-instagram-cta','Ver perfil de Instagram'));section.append(title,card);latest.after(section);
    }
    let href='https://www.instagram.com/hakisv1/',handle='hakisv1';
    try{
      const original=$('#instagramFooter')?.getAttribute('href');const url=new URL(original||href,location.origin);
      if(url.protocol==='https:'&&/(^|\.)instagram\.com$/.test(url.hostname)){
        href=url.href;handle=url.pathname.split('/').filter(Boolean)[0]||handle;
      }
    }catch{}
    const card=$('.haki-instagram-card',section);card.href=href;card.setAttribute('aria-label','Visitar @'+handle+' en Instagram (se abre en una pestaña nueva)');
    $('.haki-instagram-head strong',section).textContent='@'+handle;section.hidden=latest.hidden;
  }
  function polish(){
    const guideLabels={compression:'Compresión',oversized:'Oversized',pants:'Pants',shorts:'Shorts'};
    $$('#collectionsGrid .collection-tile').forEach(tile=>{if(mobile.matches)tile.dataset.hakiPress='none';else delete tile.dataset.hakiPress;if(!$('.haki-collection-cta',tile))tile.append(create('span','haki-collection-cta','VER PRENDAS'));});
    $$('article.product[data-code]').forEach(card=>{
      const info=$('.product-info',card);
      const guide=guideLabels[card.dataset.sizeGuide] || '';
      let label=$('.haki-card-guide',card);
      if(guide&&info){if(!label){label=create('p','haki-card-guide');$('strong',info)?.before(label);}if(label)label.textContent=guide;}
      else label?.remove();
    });
    setupFooter();syncSocials();setupInstagram();

  }
  function setup(){
    // Legacy inline sheets move into body at DOMContentLoaded; keep this scoped sheet last.
    const sheet=$('link[data-mobile-storefront]');if(sheet)document.body.append(sheet);
    polish();
    for(const id of ['collectionsGrid','products','newProducts','latestProducts']){
      const rail=document.getElementById(id);if(rail)new MutationObserver(queue).observe(rail,{childList:true});
    }
    window.addEventListener('haki:catalog-updated',queue);window.addEventListener('hashchange',queue);mobile.addEventListener('change',queue);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
