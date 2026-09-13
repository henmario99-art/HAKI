(() => {
  const sizes=['S','M','L','XL'];
  const stock={
    'BATC-01':{S:1,M:3,L:2,XL:0},'BATC-02':{S:0,M:2,L:1,XL:0},'BATC-06':{S:1,M:1,L:1,XL:0},
    'SUPC-01':{S:2,M:4,L:4,XL:1},'SUPC-03':{S:1,M:1,L:2,XL:1},
    'YLAC-01':{S:1,M:3,L:1,XL:1},'YLAC-06':{S:1,M:0,L:1,XL:0},'YLAC-03':{S:1,M:0,L:0,XL:0},
    'GSC-04':{S:0,M:0,L:1,XL:0},'GSC-03':{S:2,M:2,L:3,XL:2},'GSC-08':{S:1,M:0,L:2,XL:0},'GSL1-03':{S:0,M:1,L:0,XL:0},
    'SUPH-06':{S:1,M:1,L:2,XL:0},'SUPH-01':{S:0,M:1,L:1,XL:0},
    'BDC1:1-09':{S:0,M:1,L:1,XL:0},'BDC1:1-01':{S:1,M:1,L:0,XL:0},
    'BDC-06':{S:1,M:0,L:0,XL:0},'BDC-03':{S:2,M:0,L:0,XL:0},'BDC-01':{S:1,M:0,L:0,XL:0},'BDH-01':{S:1,M:0,L:0,XL:0},
    'BATL-01':{S:0,M:0,L:1,XL:1},'BATL-02':{S:1,M:1,L:1,XL:0},'SUPL-01':{S:0,M:1,L:0,XL:0},'GSL-06':{S:0,M:1,L:0,XL:0},
    'YLAF-01':{S:2,M:3,L:2,XL:2},'YLAF-03':{S:1,M:1,L:1,XL:0},'YLAF1-01':{S:2,M:3,L:2,XL:2},'YLAF2-01':{S:1,M:2,L:2,XL:1},'YLAF1-02':{S:0,M:0,L:0,XL:0},
    'ARG':{S:0,M:0,L:0,XL:0},'POR':{S:0,M:0,L:0,XL:0},
    'AOTF-02':{S:1,M:0,L:0,XL:1},'AOTF-01':{S:1,M:0,L:0,XL:0},'AOTF-03':{S:1,M:0,L:0,XL:0},'YLAO-01':{S:0,M:0,L:1,XL:0},
    'GLD-01':{S:1,M:1,L:1,XL:1},'YLAP-01':{S:1,M:1,L:2,XL:1},'AOTP-06':{S:1,M:0,L:0,XL:0},
    'YLAP1-01':{S:0,M:1,L:2,XL:1},'YLAP3-01':{S:0,M:1,L:2,XL:1},'YLAP4-01':{S:0,M:1,L:1,XL:1}
  };
  const upper=v=>String(v||'').toLocaleUpperCase('es-SV');
  function sync(){
    if(!window.state?.products)return;
    const collection=state.config?.colecciones?.find?.(c=>c.id==='collection-4');
    if(collection&&collection.nombre!=='Oversized')collection.nombre='Oversized';
    state.products.forEach(product=>{
      const source=stock[upper(product.codigo)];
      if(!source)return;
      product.stock={...source};
      product.tallas ||= {};
      sizes.forEach(size=>product.tallas[size]=source[size]>0);
    });
    const cards=[...document.querySelectorAll('#products .product-card')];
    cards.forEach((card,index)=>{
      const product=state.filtered?.[index];
      const source=stock[upper(product?.codigo)];
      if(!source)return;
      card.querySelectorAll('input[data-size]').forEach(input=>{
        const size=input.dataset.size;
        input.checked=source[size]>0;
        const badge=input.closest('label')?.querySelector('.admin-stock-count');
        if(badge)badge.textContent=`${source[size]} u.`;
      });
    });
  }
  setInterval(sync,160);
})();
