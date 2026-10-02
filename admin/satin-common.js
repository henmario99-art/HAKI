window.hakiIcon = (name) => {
  const paths = {menu:'M4 6h16M4 12h16M4 18h16',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',back:'m15 4-8 8 8 8',down:'m5 9 7 7 7-7',close:'m6 6 12 12M18 6 6 18',image:'M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9M16 5h6M19 2v6M3 17l5-5 4 4 3-3 6 6M9 7h.01',settings:'M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4',refresh:'M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5',box:'m12 3 9 5v9l-9 5-9-5V8l9-5m0 19V12M3 8l9 4 9-4M7.5 5.5l9 5v5',card:'M3 8h18M3 12h18M6 16h5M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',receipt:'M6 3h12v19l-3-2-3 2-3-2-3 2V3m3 4h6M9 11h6M9 15h4',chart:'M4 3v18h17M8 16V9M13 16V5M18 16v-5',archive:'M3 3h18v5H3V3m2 5v13h14V8m-10 4h6',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7'};
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.settings}"/></svg>`;
};
window.hakiDrawer = (button, title) => {
  const dialog = document.createElement('dialog');dialog.className='satin-drawer';
  dialog.innerHTML=`<header><strong>${title}</strong><button type="button" class="round" aria-label="Cerrar menú">${hakiIcon('close')}</button></header><nav></nav>`;
  document.body.append(dialog);
  const close=()=>{dialog.close();button.setAttribute('aria-expanded','false');};
  button.setAttribute('aria-expanded','false');button.setAttribute('aria-haspopup','dialog');
  button.onclick=()=>{dialog.showModal();button.setAttribute('aria-expanded','true');};
  dialog.querySelector('button').onclick=close;
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  dialog.addEventListener('close',()=>button.setAttribute('aria-expanded','false'));
  const nav=dialog.querySelector('nav');
  const theme=document.createElement('button');theme.type='button';theme.dataset.systemThemeToggle='';
  theme.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z"/></svg><span data-theme-label>Modo oscuro</span><span>◐</span>';
  theme.onclick=()=>window.HAKITheme.toggle();nav.after(theme);theme.className='system-theme-toggle';
  window.HAKITheme.configure(document.documentElement.dataset.theme);
  return {dialog,nav,close};
};
window.hakiPhotoView = (src) => {
  let dialog=document.getElementById('packageLightbox');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='packageLightbox';dialog.className='photo-lightbox';dialog.innerHTML=`<button class="photo-close" aria-label="Cerrar fotografía">${hakiIcon('close')}</button><img alt="Fotografía del paquete">`;document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close();};}
  dialog.querySelector('img').src=src;dialog.showModal();
};
