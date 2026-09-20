(() => {
  function update() {
    let banner = document.getElementById('pwaOfflineStatus');
    if (!banner) {
      banner = document.createElement('p');
      banner.id = 'pwaOfflineStatus';
      banner.setAttribute('role', 'status');
      banner.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:99999;padding:12px 16px;background:#fff;color:#111;border:1px solid #777;border-radius:12px;font:12px/1.5 system-ui;text-align:center;pointer-events:none';
      banner.textContent = 'Sin conexión. Precios y disponibilidad guardados; reconéctate para confirmar tu pedido.';
      document.body.append(banner);
    }
    banner.hidden = navigator.onLine;
  }
  addEventListener('online', update);
  addEventListener('offline', update);
  update();
})();
