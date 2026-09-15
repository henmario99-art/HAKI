// Flujo del panel de ventas: la semana normal siempre muestra sus 7 días.
// Los días se ocultan únicamente mientras se crea o edita una venta.
(() => {
  const days = document.querySelector('#days');
  const editor = document.querySelector('#saleEditor');
  if (!days || !editor) return;

  const scrollToDays = () => requestAnimationFrame(() => {
    days.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Al entrar al panel/semanas, siempre debe verse la semana completa.
  if (editor.hidden) days.hidden = false;

  showEditor = function () {
    // Solo durante el registro/edición ocultamos las tarjetas de los 7 días.
    days.hidden = true;
    editor.hidden = false;
    requestAnimationFrame(() => editor.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  hideEditor = function () {
    editor.hidden = true;
    days.hidden = false;
    state.editing = null;
    state.previousWeekStart = '';
    scrollToDays();
  };

  // Los listeners originales guardaron la referencia anterior de hideEditor.
  // Forzamos la restauración de la semana completa al cerrar o cancelar.
  ['closeDialog', 'cancelDialog'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      days.hidden = false;
      scrollToDays();
    });
  });
})();
