(() => {
  const STYLE_ID = 'haki-sales-order-layout-v7-style';

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Pedido: nombre + canal, códigos, total y 3 controles; basado en la maqueta del 24-09. */
      .haki-day-card{
        background:transparent!important;
        border:0!important;
        border-radius:0!important;
        box-shadow:none!important;
        overflow:visible!important;
      }
      .haki-day-heading{
        display:flex;align-items:center;justify-content:space-between;gap:12px;
        padding:8px 2px 10px;
      }
      .haki-day-heading .haki-day-toggle{
        width:auto!important;min-width:0!important;display:flex!important;align-items:center!important;
        gap:0!important;padding:0!important;border:0!important;border-radius:0!important;
        background:transparent!important;box-shadow:none!important;
      }
      .haki-day-heading .haki-day-copy strong{
        display:block;font-size:16px!important;line-height:1.25;font-weight:650!important;color:#191919;
      }
      .haki-day-heading .haki-day-copy small,
      .haki-day-heading .haki-day-count,
      .haki-day-heading .haki-day-arrow{display:none!important}
      .haki-day-heading .haki-day-new{
        flex:0 0 auto;border:0!important;background:transparent!important;color:#191919!important;
        padding:4px 0!important;border-radius:0!important;font-size:14px!important;
        line-height:1.2;font-weight:650!important;box-shadow:none!important;
      }
      .haki-day-heading .haki-day-new:hover{text-decoration:underline}
      .haki-day-detail{
        border-top:0!important;padding:0 0 10px!important;
        display:grid;gap:10px;
      }
      .haki-day-detail[hidden]{display:none!important}
      .haki-day-actions{display:none!important}

      .haki-sale-mini:not(.archived-sale-card){
        display:grid!important;
        grid-template-columns:minmax(0,1fr) auto!important;
        grid-template-areas:"copy amount" "controls controls";
        align-items:start!important;
        column-gap:14px!important;row-gap:11px!important;
        width:100%!important;box-sizing:border-box!important;
        padding:14px!important;margin:0!important;
        background:#fff!important;border:1px solid #bdbdb8!important;
        border-radius:17px!important;box-shadow:none!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-main-copy{
        grid-area:copy;min-width:0!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .amount{
        grid-area:amount;display:block!important;align-self:start!important;
        margin:0!important;padding:0!important;white-space:nowrap;
        color:#202020!important;font-size:18px!important;line-height:1.25!important;font-weight:500!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-client-line{
        display:flex!important;align-items:baseline!important;gap:7px!important;
        width:100%;min-width:0;white-space:nowrap!important;overflow:hidden!important;
        line-height:1.3!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-client-line strong{
        flex:0 1 auto;max-width:72%;min-width:0;overflow:hidden!important;
        text-overflow:ellipsis;white-space:nowrap;font-size:16px!important;
        line-height:1.25!important;font-weight:650!important;color:#202020!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-client-line .sale-channel{
        flex:0 0 auto!important;margin:0!important;padding:0!important;border-radius:0!important;
        background:transparent!important;font-size:13px!important;line-height:1.2!important;font-weight:550!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-channel-instagram{color:#d44343!important}
      .haki-sale-mini:not(.archived-sale-card) .sale-channel-whatsapp{color:#1a8d50!important}
      .haki-sale-mini:not(.archived-sale-card) .sale-channel-other{color:#666!important}
      .haki-sale-mini:not(.archived-sale-card) .sale-order-codes{
        display:block!important;width:100%;margin:4px 0 0!important;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        color:#303030!important;font-size:14px!important;line-height:1.3!important;font-weight:500!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-destination,
      .haki-sale-mini:not(.archived-sale-card) .sale-client-separator,
      .haki-sale-mini:not(.archived-sale-card) .sale-location-inline{display:none!important}

      .haki-sale-mini:not(.archived-sale-card) .sale-quick-controls{
        grid-area:controls!important;display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        gap:8px!important;width:100%!important;max-width:none!important;
        margin:0!important;padding:0!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-quick-controls label{
        display:block!important;min-width:0!important;margin:0!important;padding:0!important;
        font-size:0!important;line-height:0!important;color:transparent!important;
      }
      .haki-sale-mini:not(.archived-sale-card) .sale-quick-controls select{
        display:block!important;width:100%!important;height:34px!important;min-height:34px!important;
        margin:0!important;padding:4px 20px 4px 8px!important;
        border-radius:5px!important;border-width:1px!important;
        font-size:12px!important;line-height:1.1!important;font-weight:600!important;
        box-shadow:none!important;
        background-position:right 6px center!important;
      }

      @media(max-width:430px){
        .haki-day-heading{padding-left:1px;padding-right:1px}
        .haki-day-heading .haki-day-copy strong{font-size:15px!important}
        .haki-day-heading .haki-day-new{font-size:13px!important}
        .haki-sale-mini:not(.archived-sale-card){
          padding:12px!important;column-gap:9px!important;row-gap:9px!important;border-radius:15px!important;
        }
        .haki-sale-mini:not(.archived-sale-card) .sale-client-line{gap:5px!important}
        .haki-sale-mini:not(.archived-sale-card) .sale-client-line strong{max-width:66%;font-size:15px!important}
        .haki-sale-mini:not(.archived-sale-card) .sale-client-line .sale-channel{font-size:12px!important}
        .haki-sale-mini:not(.archived-sale-card) .sale-order-codes{font-size:13px!important}
        .haki-sale-mini:not(.archived-sale-card) .amount{font-size:17px!important}
        .haki-sale-mini:not(.archived-sale-card) .sale-quick-controls{gap:6px!important}
        .haki-sale-mini:not(.archived-sale-card) .sale-quick-controls select{
          height:32px!important;min-height:32px!important;font-size:11px!important;
          padding-left:6px!important;padding-right:17px!important;
        }
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
    if (!card || card.classList.contains('archived-sale-card') || card.dataset.orderLayout === 'v7') return;

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

    let order = oldOrder || oldDestination || document.createElement('small');
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

    card.dataset.orderLayout = 'v7';
  }

  function decorateDay(day) {
    if (!day || day.dataset.orderDayLayout === 'v7') return;
    const toggle = day.querySelector(':scope > .haki-day-toggle');
    const detail = day.querySelector(':scope > .haki-day-detail');
    if (!toggle || !detail) return;

    const actions = detail.querySelector(':scope > .haki-day-actions');
    const add = actions?.querySelector('.haki-day-new');

    const heading = document.createElement('div');
    heading.className = 'haki-day-heading';
    day.insertBefore(heading, toggle);
    heading.append(toggle);

    if (add) {
      add.textContent = '+ Nueva Venta';
      heading.append(add);
    }
    if (actions && !actions.children.length) actions.remove();

    day.dataset.orderDayLayout = 'v7';
  }

  function decorateAll() {
    document.querySelectorAll('.haki-day-card').forEach(decorateDay);
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