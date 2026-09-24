(() => {
  const ua = navigator.userAgent || '';
  const isInstagram = /Instagram/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (!isInstagram || !isIOS) return;

  const root = document.documentElement;
  root.classList.add('instagram-ios-safari-gate-v11');

  const style = document.createElement('style');
  style.id = 'instagramSafariGateStyle';
  style.textContent = `
    html.instagram-ios-safari-gate-v11,
    html.instagram-ios-safari-gate-v11 body{
      min-height:100%!important;background:#fff!important;overflow:hidden!important;
      overscroll-behavior:none!important;
    }
    html.instagram-ios-safari-gate-v11 body > *:not(#instagramSafariGate){
      display:none!important;
    }
    #instagramSafariGate{
      position:fixed;inset:0;z-index:2147483646;display:grid!important;place-items:center;
      width:100%;min-height:100dvh;box-sizing:border-box;
      padding:max(24px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom));
      background:#fff!important;color:#111!important;visibility:visible!important;
      font-family:Arial,Helvetica,sans-serif;
    }
    .instagram-safari-gate-card{
      width:min(420px,100%);display:flex;flex-direction:column;align-items:center;text-align:center;
    }
    .instagram-safari-gate-brand{
      margin-bottom:34px;font-size:34px;line-height:1;font-weight:900;letter-spacing:.12em;
    }
    .instagram-safari-gate-title{
      margin:0 0 22px;font-size:clamp(28px,8vw,42px);line-height:1;
      letter-spacing:-.04em;font-weight:900;
    }
    .instagram-safari-open{
      width:100%;min-height:76px;padding:15px 18px;border:1px solid #111;border-radius:12px;
      background:#111;color:#fff;font:inherit;cursor:pointer;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:4px;
    }
    .instagram-safari-open span{font-size:12px;line-height:1.2;font-weight:600}
    .instagram-safari-open strong{font-size:17px;line-height:1.2;font-weight:850}
    .instagram-safari-open:disabled{opacity:.72}
  `;
  document.head.appendChild(style);

  function showGate() {
    if (!document.body || document.getElementById('instagramSafariGate')) return;

    const gate = document.createElement('section');
    gate.id = 'instagramSafariGate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'instagramSafariGateTitle');
    gate.innerHTML = `
      <div class="instagram-safari-gate-card">
        <div class="instagram-safari-gate-brand" aria-hidden="true">HAKI</div>
        <h1 class="instagram-safari-gate-title" id="instagramSafariGateTitle">ABRE HAKI EN SAFARI</h1>
        <button class="instagram-safari-open" id="instagramSafariOpen" type="button">
          <span>Para una mejor experiencia:</span>
          <strong>Abrir en Safari</strong>
        </button>
      </div>
    `;

    document.body.appendChild(gate);

    const button = gate.querySelector('#instagramSafariOpen');
    button?.addEventListener('click', () => {
      const target = location.href;
      const safariTarget = /^https:/i.test(target)
        ? target.replace(/^https:/i, 'x-safari-https:')
        : (/^http:/i.test(target) ? target.replace(/^http:/i, 'x-safari-http:') : target);

      button.disabled = true;
      button.setAttribute('aria-busy', 'true');

      // First attempt the Safari scheme from the user's direct tap.
      if (safariTarget !== target) {
        try { location.href = safariTarget; } catch {}
      }

      // Fallback for Instagram builds that ignore the custom scheme.
      window.setTimeout(() => {
        try {
          const link = document.createElement('a');
          link.href = target;
          link.target = '_blank';
          link.rel = 'noopener noreferrer external';
          document.body.appendChild(link);
          link.click();
          link.remove();
        } catch {}
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }, 650);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showGate, {once:true});
  } else {
    showGate();
  }
})();