(() => {
  // El Salvador stays at UTC-06:00. The launch is the same instant everywhere.
  const launchAt = Date.parse('2026-10-31T10:00:00-06:00');
  const countdownPaths = new Set(['/nuevo-drop', '/nuevo-drop/', '/nuevo-drop.html']);
  const onCountdown = countdownPaths.has(location.pathname);

  if (!onCountdown) {
    if (Date.now() < launchAt) {
      const preview = new URLSearchParams(location.search).get('preview') === '1';
      // Keep content hidden until the session is verified or the launch page opens.
      const blackout = document.createElement('style');
      blackout.textContent = 'html{background:#000!important}body{display:none!important}';
      document.head.append(blackout);
      if (!preview) {
        location.replace('/nuevo-drop');
        return;
      }
      let checking = false;
      async function verifyPreview() {
        if (checking) return;
        if (Date.now() >= launchAt) { blackout.remove(); return; }
        checking = true;
        try {
          const response = await fetch('/.netlify/functions/auth', {
            credentials:'same-origin', cache:'no-store', signal:AbortSignal.timeout(8000),
          });
          const data = response.ok ? await response.json() : null;
          if (Date.now() >= launchAt || data?.authenticated === true) blackout.remove();
          else location.replace('/nuevo-drop');
        } catch {
          if (Date.now() >= launchAt) blackout.remove();
          else location.replace('/nuevo-drop');
        } finally { checking = false; }
      }
      verifyPreview();
      window.addEventListener('focus', verifyPreview);
      window.addEventListener('pageshow', verifyPreview);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) verifyPreview(); });
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
