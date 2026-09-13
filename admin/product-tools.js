(() => {
  const COLOR_OPTIONS = [
    { value: 'Blanco', hex: '#f7f7f3', border: '#bdbdb8' },
    { value: 'Negro', hex: '#111111', border: '#111111' },
    { value: 'Rojo', hex: '#cf1111', border: '#cf1111' },
    { value: 'Azul', hex: '#b9d9f1', border: '#9dbed8' },
    { value: 'Gris', hex: '#a7a7a4', border: '#91918e' },
    { value: 'Rosa', hex: '#f0cddd', border: '#ddb6c8' }
  ];

  function ensureStyles() {
    if (document.getElementById('haki-product-tools-style')) return;
    const style = document.createElement('style');
    style.id = 'haki-product-tools-style';
    style.textContent = `
      .product-color-setting{margin-top:18px;padding-top:16px;border-top:1px solid #e4e4e4}
      .product-color-setting>strong{display:block;margin-bottom:5px;font-size:13px}
      .product-color-setting>p{margin:0 0 12px;color:#777;font-size:12px;line-height:1.4}
      .color-swatches{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .color-swatch{position:relative;width:34px;height:34px;border-radius:50%;border:1px solid var(--swatch-border,#bbb);background:var(--swatch,#eee);cursor:pointer;padding:0;box-shadow:0 0 0 0 transparent;transition:transform .15s ease,box-shadow .15s ease}
      .color-swatch:hover{transform:translateY(-1px)}
      .color-swatch.is-selected{box-shadow:0 0 0 2px var(--card,#fff),0 0 0 4px #111}
      .color-swatch.is-selected::after{content:'✓';position:absolute;inset:0;display:grid;place-items:center;font-size:13px;font-weight:900;color:var(--check,#fff);text-shadow:0 1px 2px #0005}
      .color-swatch[data-color='Blanco'].is-selected::after,.color-swatch[data-color='Azul'].is-selected::after,.color-swatch[data-color='Rosa'].is-selected::after{color:#111;text-shadow:none}
      .color-swatch input{position:absolute;opacity:0;pointer-events:none}
      html[data-theme=oscuro] .product-color-setting{border-top-color:#444}
      html[data-theme=oscuro] .color-swatch.is-selected{box-shadow:0 0 0 2px #242424,0 0 0 4px #fff}
      @media(max-width:700px){#jumpProductsBtn{flex:1 1 auto}.color-swatch{width:32px;height:32px}}
    `;
    document.head.appendChild(style);
  }

  function setupJumpButton() {
    const add = document.getElementById('addBtn');
    if (!add || document.getElementById('jumpProductsBtn')) return;
    const button = document.createElement('button');
    button.id = 'jumpProductsBtn';
    button.className = 'ghost';
    button.type = 'button';
    button.textContent = 'Ir a productos';
    button.addEventListener('click', () => {
      const target = document.querySelector('.section-title') || document.getElementById('products');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    add.insertAdjacentElement('afterend', button);
  }

  function normalizeColors(product) {
    if (!Array.isArray(product.colores)) {
      product.colores = product.color ? [product.color] : [];
    }
    product.colores = [...new Set(product.colores.map(String).filter(Boolean))];
    return product.colores;
  }

  function renderCardColorPicker(card, product) {
    if (!card || !product || card.querySelector('.product-color-setting')) return;
    const colors = normalizeColors(product);
    const wrap = document.createElement('section');
    wrap.className = 'product-color-setting';
    wrap.innerHTML = '<strong>Color de la prenda</strong><p>Selecciona uno o más colores. GYMRAT TEST usará esta información para recomendar prendas correctamente.</p>';
    const swatches = document.createElement('div');
    swatches.className = 'color-swatches';

    COLOR_OPTIONS.forEach(option => {
      const label = document.createElement('label');
      label.className = `color-swatch${colors.includes(option.value) ? ' is-selected' : ''}`;
      label.dataset.color = option.value;
      label.title = option.value;
      label.setAttribute('aria-label', option.value);
      label.style.setProperty('--swatch', option.hex);
      label.style.setProperty('--swatch-border', option.border);
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = colors.includes(option.value);
      input.addEventListener('change', () => {
        const set = new Set(normalizeColors(product));
        if (input.checked) set.add(option.value); else set.delete(option.value);
        product.colores = [...set];
        label.classList.toggle('is-selected', input.checked);
      });
      label.appendChild(input);
      swatches.appendChild(label);
    });

    wrap.appendChild(swatches);
    const placement = card.querySelector('.product-placement');
    if (placement) placement.insertAdjacentElement('afterend', wrap);
    else card.appendChild(wrap);
  }

  function syncProductColorPickers() {
    if (typeof state === 'undefined' || !Array.isArray(state.filtered)) return;
    const cards = [...document.querySelectorAll('#products .product-card')];
    cards.forEach((card, index) => renderCardColorPicker(card, state.filtered[index]));
  }

  function setupObserver() {
    const products = document.getElementById('products');
    if (!products || products.dataset.colorObserver === '1') return;
    products.dataset.colorObserver = '1';
    new MutationObserver(() => requestAnimationFrame(syncProductColorPickers))
      .observe(products, { childList: true });
  }

  function init() {
    ensureStyles();
    setupJumpButton();
    setupObserver();
    requestAnimationFrame(syncProductColorPickers);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();