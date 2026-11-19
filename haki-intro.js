/* Animacion de entrada de HAKI: la misma marca del administrador, mas corta. */
(() => {
  const root = document.documentElement;
  const seen = (() => { try { return sessionStorage.getItem('haki_intro_v1') === '1'; } catch { return false; } })();
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (seen || reduce || /^#(coleccion|producto)/.test(location.hash)) return;
  try { sessionStorage.setItem('haki_intro_v1', '1'); } catch {}
  const style = document.createElement('style');
  style.textContent = '#hakiIntro{position:fixed;inset:0;z-index:2147483000;background:#000;display:grid;place-items:center;transition:opacity .2s ease-out}#hakiIntro.is-out{opacity:0;pointer-events:none}#hakiIntro img{width:48vw;max-width:210px;aspect-ratio:432/492;opacity:0;transform:scale(.94);transition:opacity .2s ease-out,transform .2s ease-out}#hakiIntro.is-in img{opacity:1;transform:none}'
    + '@keyframes hakiRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}'
    + 'html.haki-intro-done :is(#homeHero,#novedades,#collectionsSection,#latestSection){animation:hakiRise .32s cubic-bezier(.22,1,.36,1) both}'
    + 'html.haki-intro-done #novedades{animation-delay:.05s}html.haki-intro-done #collectionsSection{animation-delay:.1s}html.haki-intro-done #latestSection{animation-delay:.15s}';
  document.head.append(style);
  const cover = document.createElement('div');
  cover.id = 'hakiIntro';
  cover.setAttribute('aria-hidden', 'true');
  const mark = new Image();
  mark.alt = '';
  mark.decoding = 'sync';
  mark.src = '/images/haki-intro-v2.webp';
  cover.append(mark);
  root.append(cover);
  const start = performance.now();
  const MIN = 1400, MAX = 2600;
  let closed = false;
  const show = () => requestAnimationFrame(() => cover.classList.add('is-in'));
  mark.complete ? show() : (mark.onload = show, mark.onerror = () => close());
  function close() {
    if (closed) return; closed = true;
    root.classList.add('haki-intro-done');
    cover.classList.add('is-out');
    setTimeout(() => cover.remove(), 260);
    setTimeout(() => root.classList.remove('haki-intro-done'), 900);
  }
  const ready = new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }));
  Promise.race([ready, new Promise(r => setTimeout(r, MAX))]).then(() => setTimeout(close, Math.max(0, MIN - (performance.now() - start))));
})();
