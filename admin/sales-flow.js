// Flujo móvil de ventas: el formulario ocupa su propio recorrido y los días reaparecen al salir.
(() => {
  const days = document.querySelector('#days');
  const editor = document.querySelector('#saleEditor');
  if (!days || !editor) return;

  const scrollToDays = () => requestAnimationFrame(() => {
    days.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  showEditor = function () {
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

  // Los listeners originales de cerrar/cancelar guardaron la función anterior por referencia.
  // Este segundo listener restaura siempre el listado de días después de cerrar el editor.
  ['closeDialog', 'cancelDialog'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      days.hidden = false;
      scrollToDays();
    });
  });
})();