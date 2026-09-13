(() => {
  function normalizeColors(product) {
    if (!product) return [];
    if (!Array.isArray(product.colores)) product.colores = product.color ? [product.color] : [];
    product.colores = [...new Set(product.colores.map(String).filter(Boolean))];
    return product.colores;
  }

  function bindCard(card, product) {
    if (!card || !product) return;
    const colors = normalizeColors(product);
    card.querySelectorAll('[data-color]').forEach(input => {
      if (!(input instanceof HTMLInputElement)) return;
      const color = input.dataset.color;
      const label = input.closest('.color-swatch');
      input.checked = colors.includes(color);
      label?.classList.toggle('is-selected', input.checked);
      if (input.dataset.colorBound === '1') return;
      input.dataset.colorBound = '1';
      input.addEventListener('change', () => {
        const set = new Set(normalizeColors(product));
        if (input.checked) set.add(color); else set.delete(color);
        product.colores = [...set];
        label?.classList.toggle('is-selected', input.checked);
      });
    });
  }

  function sync() {
    if (typeof state === 'undefined' || !Array.isArray(state.filtered)) return;
    const cards = [...document.querySelectorAll('#products .product-card')];
    cards.forEach((card, index) => bindCard(card, state.filtered[index]));
  }

  function init() {
    const products = document.getElementById('products');
    if (!products) return;
    new MutationObserver(() => requestAnimationFrame(sync)).observe(products, { childList: true });
    requestAnimationFrame(sync);
    setInterval(sync, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
