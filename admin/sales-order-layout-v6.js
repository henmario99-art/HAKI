(() => {
  const STYLE_ID = 'haki-sales-order-layout-v8-style';

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Conserva la nueva distribución del pedido usando el estilo visual anterior. */
      .haki-sale-mini:not(.archived-sale-card){
        grid-template-columns:minmax(0,1fr) auto!important;
        gap:6px 12px!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-main-copy{
        min-width:0!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .amount{
        display:block!important;
        align-self:start!important;
        white-space:nowrap;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-client-line{
        display:block!important;
        width:100%;
        min-width:0;
        white-space:normal!important;
        overflow:visible!important;
        line-height:1.45!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-client-line strong{
        max-width:none!important;
        overflow:visible!important;
        text-overflow:clip!important;
        white-space:normal!important;
        font-size:14px!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-order-codes{
        display:block!important;
        width:100%;
        margin:4px 0 0!important;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
        color:#222!important;
        font-size:13px!important;
        line-height:1.35;
        font-weight:700;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-quick-controls{
        width:100%;
        max-width:none!important;
        grid-column:1/-1;
        margin-top:5px;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-quick-controls label{
        display:block;
        gap:0!important;
        font-size:0!important;
        color:transparent!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-quick-controls select{
        display:block;
        width:100%;
      }
      @media(max-width:430px){
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
    if (!card || card.classList.contains('archived-sale-card') || card.dataset.orderLayout === 'v8') return;

    const main = card.querySelector('.sale-main-copy');
    const line = card.querySelector('.sale-client-line');
    const controls = card.querySelector('.sale-quick-controls');
    if (!main || !line || !controls) return;

    const sale = saleFor(card);
    let name = line.querySelector('strong');
    let channel = line.querySelector('.sale-channel');
    const oldDestination = card.querySelector('.sale-destination');
    const oldOrder = card.querySelector('.sale-order-codes');
    const oldOrderSpan = [...line.querySelectorAll('span')].find(node =>
      !node.classList.contains('sale-channel') &&
      !node.classList.contains('sale-client-separator') &&
      !node.classList.contains('sale-location-inline')
    );

    if (!name) {
      name = document.createElement('strong');
      name.textContent = sale?.cliente || 'Cliente';
    }
    if (!channel && typeof channelBadge === 'function') {
      const holder = document.createElement('span');
      holder.innerHTML = channelBadge(sale?.canal || '');
      channel = holder.firstElementChild;
    }

    const fallbackOrder = String(oldOrder?.textContent || oldOrderSpan?.textContent || '')
      .replace(/^\s*-\s*/, '').trim();
    const orderText = codeSummary(sale, fallbackOrder);

    line.replaceChildren(name);
    if (channel) line.append(channel);

    const order = oldOrder || oldDestination || document.createElement('small');
    order.className = 'sale-order-codes';
    order.textContent = orderText;
    if (order.parentElement !== main) line.insertAdjacentElement('afterend', order);

    card.querySelectorAll('.sale-client-separator,.sale-location-inline,.sale-destination')
      .forEach(node => {
        if (node !== order) node.remove();
      });

    controls.querySelectorAll('label').forEach(label => {
      [...label.childNodes].forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) node.remove();
      });
    });

    card.dataset.orderLayout = 'v8';
  }

  function decorateAll() {
    document.querySelectorAll('.haki-sale-mini:not(.archived-sale-card)').forEach(decorateCard);
  }

  installStyle();
  const days = document.getElementById('days');
  if (days) {
    new MutationObserver(() => requestAnimationFrame(decorateAll))
      .observe(days, { childList:true, subtree:true });
  }
  requestAnimationFrame(decorateAll);
})();