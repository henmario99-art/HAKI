(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set();
  function stop() { for (const a of running) a.cancel(); running.clear(); }
  window.addEventListener('haki:app-route', ({detail}) => {
    stop();
    // Back reveals the preserved list immediately: no opacity or root movement.
    if (detail.back || reduced.matches) return;
    const product = detail.hash.startsWith('#producto/');
    const category = /^#(?:categoria|coleccion)\//.test(detail.hash);
    const surface = document.querySelector(product ? '#productDetail' : '#catalogo');
    if ((!product && !category) || !surface) return;
    // Animate only inner content; moving the fixed sheet exposes images below it.
    const targets = product
      ? surface.querySelectorAll('.detail-media,.detail-summary')
      : surface.querySelectorAll('.products'); // Android stable header
    for (const el of targets) {
      if (!el.animate) continue;
      const a = el.animate([{transform:'translateY(12px)'},{transform:'translateY(0)'}],
        {duration:240,easing:'cubic-bezier(.22,1,.36,1)'});
      running.add(a);
      a.finished.catch(() => {}).finally(() => running.delete(a));
    }
  });
  reduced.addEventListener('change', stop);
  const count = document.getElementById('cartCount');
  if (count) new MutationObserver(() => {
    if (reduced.matches || !count.animate) return;
    count.getAnimations().forEach(a => a.cancel());
    count.animate([{transform:'translateY(0)'},{transform:'translateY(-3px)'},{transform:'translateY(0)'}], {duration:220});
  }).observe(count,{childList:true,characterData:true,subtree:true});
})();
