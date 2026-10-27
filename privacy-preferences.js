(() => {
  'use strict';
  if (window.HAKI_PRIVACY) return;
  const VERSION = '2026-10-27.2';
  const KEY = 'haki_privacy_preferences_v1';
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  const THEME_KEYS = ['haki_store_theme_v1', 'haki_app_theme_v1'];
  const empty = () => ({ necessary: true, preferences: false, analytics: false, marketing: false });
  let choice = null, panel, opener, expanded = false;
  function parse(raw) {
    try {
      const value = JSON.parse(raw), date = Date.parse(value?.savedAt);
      if (value?.version !== VERSION || typeof value.preferences !== 'boolean' ||
          value.analytics !== false || value.marketing !== false ||
          !Number.isFinite(date) || date > Date.now() || Date.now() - date >= MAX_AGE) return null;
      return { ...empty(), preferences: value.preferences, version: VERSION, savedAt: value.savedAt };
    } catch { return null; }
  }
  function read() {
    try { return parse(localStorage.getItem(KEY)); } catch { return null; }
  }
  function snapshot() {
    return { ...empty(), ...(choice || {}), decided: !!choice, version: VERSION };
  }
  function apply(next) {
    choice = next;
    // No Analytics tag or advertising pixel is configured in this edition.
    // Installing one requires its integration and a renewed consent version.
    window.HAKI_ANALYTICS_CONSENT = false;
    window.HAKI_MARKETING_CONSENT = false;
    if (!choice?.preferences) {
      for (const key of THEME_KEYS) { try { localStorage.removeItem(key); } catch {} }
    }
    document.dispatchEvent(new CustomEvent('haki:privacychange', { detail: snapshot() }));
  }
  function save(values) {
    const next = { ...empty(), preferences: values?.preferences === true,
      version: VERSION, savedAt: new Date().toISOString() };
    let persisted = true;
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { persisted = false; }
    apply(next);
    if (next.preferences) {
      const theme = document.documentElement.dataset.theme;
      if (theme === 'claro' || theme === 'oscuro') {
        const key = THEME_KEYS[0];
        try { localStorage.setItem(key, theme); } catch {}
      }
    }
    if (panel) {
      panel.hidden = true;
      expanded = false;
      document.getElementById('hakiPrivacyStatus').textContent = persisted
        ? 'Preferencias guardadas. Puedes cambiarlas desde Preferencias de cookies.'
        : 'Elección aplicada a esta página. Tu navegador no permite guardarla para próximas visitas.';
      restoreFocus();
    }
    return { ...snapshot(), persisted };
  }
  function open() {
    if (!panel) return;
    opener = document.activeElement;
    expanded = true;
    panel.hidden = false;
    render();
    panel.querySelector('h2').focus({ preventScroll: true });
  }
  function render() {
    panel.querySelector('[data-privacy-details]').hidden = !expanded;
    panel.querySelector('[data-privacy-save]').hidden = !expanded;
    panel.querySelector('[data-privacy-close]').hidden = !expanded;
    const configure = panel.querySelector('[data-privacy-configure]');
    configure.hidden = expanded;
    configure.setAttribute('aria-expanded', String(expanded));
    panel.querySelector('#hakiPrivacyAppearance').checked = choice?.preferences === true;
  }
  function restoreFocus() {
    const target = opener?.isConnected && !panel?.contains(opener) ? opener : document.querySelector('[data-privacy-open]');
    target?.focus({ preventScroll: true });
  }
  function reset() {
    try { localStorage.removeItem(KEY); } catch {}
    apply(null);
    if (panel) { expanded = false; panel.hidden = false; render(); }
  }
  function close() {
    if (choice) panel.hidden = true;
    else { expanded = false; render(); }
    restoreFocus();
  }
  function init() {
    panel = document.createElement('section');
    panel.id = 'hakiPrivacyPanel';
    panel.className = 'haki-privacy-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'hakiPrivacyTitle');
    panel.setAttribute('aria-describedby', 'hakiPrivacyIntro');
    panel.innerHTML = [
      '<h2 id="hakiPrivacyTitle" tabindex="-1">Tu privacidad en HAKI</h2>',
      '<p id="hakiPrivacyIntro">Usamos almacenamiento necesario para la bolsa y para recordar tu elección de privacidad. Tú decides si también podemos recordar la apariencia que elijas. Puedes seguir navegando y cotizar aunque rechaces lo opcional.</p>',
      '<p class="haki-privacy-note">La analítica y la publicidad están desactivadas en esta versión.</p>',
      '<div data-privacy-details hidden>',
      '<div class="haki-privacy-category"><strong>Necesario · Siempre activo</strong><p>Bolsa de compras, funcionamiento del catálogo y elección de privacidad. La cookie de inicio de sesión corresponde al administrador.</p></div>',
      '<label class="haki-privacy-category haki-privacy-option" for="hakiPrivacyAppearance"><span><strong>Recordar apariencia · Opcional</strong><span>Guardar tu elección de tema claro u oscuro para próximas visitas. Si lo rechazas, puedes cambiar el tema durante esta visita.</span></span><input id="hakiPrivacyAppearance" type="checkbox" name="appearance"></label>',
      '<div class="haki-privacy-category"><strong>Analítica · Inactiva</strong><p>No se carga Google Analytics. Si se incorpora, se informará y se solicitará una elección nueva antes de activarlo.</p></div>',
      '<div class="haki-privacy-category"><strong>Publicidad · Inactiva</strong><p>No se carga Meta Pixel ni seguimiento publicitario. Aceptar lo opcional no autoriza mensajes promocionales.</p></div>',
      '</div><div class="haki-privacy-actions">',
      '<button type="button" data-privacy-reject>Rechazar opcionales</button>',
      '<button type="button" data-privacy-accept>Aceptar opcionales</button>',
      '<button type="button" data-privacy-configure aria-controls="hakiPrivacyPanel" aria-expanded="false">Configurar</button>',
      '<button type="button" data-privacy-save hidden>Guardar preferencias</button>',
      '<button type="button" data-privacy-close hidden>Cerrar sin guardar</button>',
      '</div><p class="haki-privacy-links"><a href="/cookies.html">Cookies y almacenamiento</a><a href="/privacidad.html">Aviso de privacidad</a><a href="/terminos.html">Términos y condiciones</a></p>'
    ].join('');
    panel.hidden = !!choice;
    document.body.append(panel);
    const status = document.createElement('p');
    status.id = 'hakiPrivacyStatus';
    status.className = 'haki-privacy-status';
    status.setAttribute('role', 'status');
    document.body.append(status);
    panel.querySelector('[data-privacy-reject]').addEventListener('click', () => save({ preferences: false }));
    panel.querySelector('[data-privacy-accept]').addEventListener('click', () => save({ preferences: true }));
    panel.querySelector('[data-privacy-save]').addEventListener('click', () => save({ preferences: panel.querySelector('#hakiPrivacyAppearance').checked }));
    panel.querySelector('[data-privacy-configure]').addEventListener('click', open);
    panel.querySelector('[data-privacy-close]').addEventListener('click', close);
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape' && expanded) { event.preventDefault(); close(); }
    });
    document.addEventListener('click', event => {
      if (event.target.closest?.('[data-privacy-open]')) { event.preventDefault(); open(); }
    });
  }
  window.HAKI_PRIVACY = Object.freeze({
    open, reset, getPreferences: snapshot, setPreferences: save,
    allows: category => category === 'necessary' || (category === 'preferences' && choice?.preferences === true)
  });
  apply(read());
  window.addEventListener('storage', event => {
    if (event.key !== KEY && event.key !== null) return;
    apply(read());
    if (panel) { expanded = false; panel.hidden = !!choice; render(); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
