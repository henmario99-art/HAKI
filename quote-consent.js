(() => {
  const init = () => {
    const box = document.getElementById('quoteAuthorization');
    const form = document.getElementById('quoteForm');
    if (!box || !form) return;
    const version = window.HAKI_LEGAL?.version || '2026-10-27.2';
    const message = 'Autoriza el uso de estos datos para atender tu cotización antes de continuar.';
    const sync = () => box.setCustomValidity(box.checked ? '' : message);
    sync();
    box.addEventListener('change', sync);
    const guard = event => {
      sync();
      if (box.checked) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      box.focus();
      box.reportValidity();
    };
    form.addEventListener('submit', guard, true);
    document.getElementById('instagramQuote')?.addEventListener('click', guard, true);
    window.HAKI_QUOTE_PRIVACY = Object.freeze({
      proof: () => box.checked
        ? `\n\nAutorizo el uso de estos datos para atender mi cotización conforme al aviso de privacidad de HAKI versión ${version}.`
        : ''
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
