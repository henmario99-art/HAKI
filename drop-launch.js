(() => {
  // El Salvador stays at UTC-06:00. The launch is the same instant everywhere.
  const launchAt = Date.parse('2026-10-31T10:00:00-06:00');
  const countdownPaths = new Set(['/nuevo-drop', '/nuevo-drop/', '/nuevo-drop.html']);
  const onCountdown = countdownPaths.has(location.pathname);

  if (!onCountdown) {
    if (Date.now() < launchAt) {
      // Keep the storefront from flashing while the browser opens the launch page.
      const blackout = document.createElement('style');
      blackout.textContent = 'html{background:#000!important}body{display:none!important}';
      document.head.append(blackout);
      location.replace('/nuevo-drop');
    }
    return;
  }

  let timer;
  let revealed = false;
  function tick() {
    const remaining = launchAt - Date.now();
    if (remaining <= 0) {
      if (revealed) return;
      revealed = true;
      clearInterval(timer);
      location.replace('/#nuevo-drop');
      return;
    }
    const total = Math.ceil(remaining / 1000);
    const values = [Math.floor(total / 86400), Math.floor(total / 3600) % 24, Math.floor(total / 60) % 60, total % 60];
    document.querySelectorAll('[data-countdown]').forEach((element, index) => {
      element.textContent = String(values[index]).padStart(2, '0');
    });
  }
  function start() {
    tick();
    if (!revealed) timer = setInterval(tick, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  window.addEventListener('pageshow', tick);
})();
