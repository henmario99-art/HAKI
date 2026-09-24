(() => {
  const STYLE_ID = 'haki-sales-order-layout-v6-style';

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .haki-sale-mini:not(.archived-sale-card){
        grid-template-columns:minmax(0,1fr)!important;
        gap:7px!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .amount{display:none!important}
      .haki-sale-mini:not(.archived-sale-card) .sale-main-copy{grid-column:1/-1;min-width:0}
      .haki-sale-mini:not(.archived-sale-card) .sale-client-line{
        display:flex!important;align-items:center!important;width:100%;min-width:0;
        white-space:nowrap!important;overflow:hidden!important;line-height:1.35;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-client-line strong{
        flex:0 1 auto;max-width:42%;min-width:0;overflow:hidden!important;
        text-overflow:ellipsis;white-space:nowrap;font-size:14px;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-client-separator{
        flex:0 0 auto;color:#555;font-size:12px;font-weight:700;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-location-inline{
        flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;
        white-space:nowrap;color:#555;font-size:12px;font-weight:700;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-client-line .sale-channel{
        flex:0 0 auto;margin-left:0!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-order-codes{
        display:block!important;width:100%;margin:4px 0 0!important;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        color:#222!important;font-size:13px!important;line-height:1.35;font-weight:700;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-quick-controls{
        width:100%;max-width:none!important;grid-column:1/-1;margin-top:5px;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-quick-controls label{
        display:block;gap:0!important;font-size:0!important;color:transparent!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-quick-controls select{
        display:block;width:100%;
      }
      @media(max-width:430px){
        .haki-sale-mini:not(.archived-sale-card) .sale-client-line strong{max-width:38%}
        .haki-sale-mini:not(.archived-sale-card) .sale-order-codes{font-size:12px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function saleFor(card) {
    try {
      if (typeof state === 'object' && Array.isArray(state.sales)) {
        return state.sales.find(sale => String(sale.id) === String(card.dataset.saleId)) || null;
      }
    } catch {}
    return null;
  }

  function codeSummary(sale, fallback) {
    if (!sale || !Array.isArray(sale.items)) return fallback || 'Pedido';
    const parts = sale.items.map(item => {
      const code = String(item?.codigo || '').trim();
      if (!code) return '';
      const qty = Number(item?.cantidad) || 1;
      return qty > 1 ? `${code} ×${qty}` : code;
    }).filter(Boolean);
    return parts.length ? parts.join(' - ') : (fallback || 'Pedido');
  }

  function decorateCard(card) {
    if (!card || card.classList.contains('archived-sale-card')) return;

    const line = card.querySelector('.sale-client-line');
    const controls = card.querySelector('.sale-quick-controls');
    if (!line || !controls) return;

    const sale = saleFor(card);
    const name = line.querySelector('strong');
    const channel = line.querySelector('.sale-channel');
    const oldDestination = card.querySelector('.sale-destination');
    const oldOrderSpan = [...line.querySelectorAll('span')].find(node => !node.classList.contains('sale-channel'));

    const destinationText = String(sale?.lugarHorario || oldDestination?.textContent || 'Sin destino').trim() || 'Sin destino';
    const fallbackOrder = String(oldOrderSpan?.textContent || '').replace(/^\s*-\s*/, '').trim();
    const orderText = codeSummary(sale, fallbackOrder);

    if (name && channel) {
      const sepA = document.createElement('span');
      sepA.className = 'sale-client-separator';
      sepA.textContent = ' - ';

      const destination = document.createElement('span');
      destination.className = 'sale-location-inline';
      destination.textContent = destinationText;

      const sepB = document.createElement('span');
      sepB.className = 'sale-client-separator';
      sepB.textContent = ' - ';

      line.replaceChildren(name, sepA, destination, sepB, channel);
    }

    let order = card.querySelector('.sale-order-codes');
    if (!order) {
      order = oldDestination || document.createElement('small');
      order.className = 'sale-order-codes';
      line.insertAdjacentElement('afterend', order);
    }
    order.textContent = orderText;

    controls.querySelectorAll('label').forEach(label => {
      [...label.childNodes].forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) node.remove();
      });
    });

    card.dataset.orderLayout = 'v6';
  }

  function decorateAll() {
    document.querySelectorAll('.haki-sale-mini:not(.archived-sale-card)').forEach(decorateCard);
  }

  installStyle();
  const days = document.getElementById('days');
  if (days) {
    new MutationObserver(() => requestAnimationFrame(decorateAll))
      .observe(days, {childList:true, subtree:true});
  }
  requestAnimationFrame(decorateAll);
})();