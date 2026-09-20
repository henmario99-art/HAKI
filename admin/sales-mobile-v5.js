(() => {
  const title = document.querySelector('#weekTitle');
  const month = document.querySelector('#weekRange');
  [title, month].forEach(field => {
    if (!field) return;
    // Keep editing available; the 16px focus size prevents iPhone auto-zoom.
    field.contentEditable = 'true';
  });

  const salesTab = document.querySelector('.sales-tabs [data-tab="sales"]');
  const toggle = salesTab?.querySelector('.haki-sales-menu-toggle');
  if (toggle) toggle.replaceWith(document.createTextNode('Ventas'));

  const decorate = () => {
    const sales = Array.isArray(state?.sales) ? state.sales : [];
    const active = sales.filter(sale => !['Cancelado', 'No retirado'].includes(sale.estado));
    const sold = active.reduce((sum, sale) => sum + (Number(sale.subtotal ?? ((Number(sale.total) || 0) - (Number(sale.envio) || 0))) || 0), 0);
    const collect = active.filter(sale => sale.dinero === 'Pendiente').reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const soldNode = document.querySelector('#metricSales');
    const collectNode = document.querySelector('#metricPending');
    const unclaimedNode = document.querySelector('#metricUnclaimed');
    if (soldNode) soldNode.textContent = money(sold);
    if (collectNode) collectNode.textContent = money(collect);
    if (unclaimedNode) unclaimedNode.textContent = String(sales.filter(sale => sale.estado === 'No retirado').length);
  };

  const observer = new MutationObserver(() => requestAnimationFrame(decorate));
  const days = document.querySelector('#days');
  if (days) observer.observe(days, { childList: true, subtree: true });
  decorate();
})();
