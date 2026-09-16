// Flujo del panel de ventas: la semana normal siempre muestra sus 7 días.
// Al crear o editar una venta, la interfaz cambia a una vista independiente.
(() => {
  const days = document.querySelector('#days');
  const editor = document.querySelector('#saleEditor');
  if (!days || !editor) return;

  const enterEditorMode = () => {
    document.body.classList.add('sale-editor-mode');
    days.hidden = true;
    editor.hidden = false;
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  };

  const leaveEditorMode = () => {
    document.body.classList.remove('sale-editor-mode');
    editor.hidden = true;
    days.hidden = false;
    state.editing = null;
    state.previousWeekStart = '';
    requestAnimationFrame(() => {
      days.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  };

  // Al entrar al panel/semanas, siempre debe verse la semana completa.
  document.body.classList.remove('sale-editor-mode');
  if (editor.hidden) days.hidden = false;

  showEditor = function () {
    enterEditorMode();
  };

  hideEditor = function () {
    leaveEditorMode();
  };

  // Los listeners originales pueden conservar referencias previas.
  // Aseguramos que cerrar o cancelar siempre restaure la semana completa.
  ['closeDialog', 'cancelDialog'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      leaveEditorMode();
    });
  });
})();
