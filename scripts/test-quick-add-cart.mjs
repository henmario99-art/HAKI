import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

for(const path of ['../app.js','../app/app.js']){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  const start=source.indexOf('  function addToCart('),end=source.indexOf('  function changeQty(',start);
  assert(start>=0&&end>start);
  const product={codigo:'SYNTHETIC',nombre:'Prenda de prueba',precio:18,tallas:{S:true,M:false,L:true,XL:false}};
  const calls={save:0,render:0,open:0,analytics:0};
  const context={
    productByCode:code=>code===product.codigo?product:null,
    state:{selected:{SYNTHETIC:'S'},cart:[]},checkoutStartedSignature:'',
    saveCart:()=>calls.save++,renderCart:()=>calls.render++,openCart:()=>calls.open++,
    trackAnalytics:()=>calls.analytics++,analyticsItem:()=>({}),ANALYTICS_CURRENCY:'USD',showToast(){},
  };
  vm.createContext(context);vm.runInContext(source.slice(start,end),context);
  vm.runInContext("addToCart('SYNTHETIC')",context);
  assert.equal(calls.open,1,'existing add flow must still open the cart');
  vm.runInContext("addToCart('SYNTHETIC',{openDrawer:false})",context);
  assert.equal(context.state.cart.length,1);assert.equal(context.state.cart[0].cantidad,2);
  assert.equal(calls.open,1,'quick add keeps browsing while using the same cart line');
  context.state.selected.SYNTHETIC='M';
  vm.runInContext("addToCart('SYNTHETIC',{openDrawer:false})",context);
  assert.equal(context.state.cart[0].cantidad,2,'unavailable size must not be added');
  assert.equal(calls.save,2);assert.equal(calls.render,2);assert.equal(calls.analytics,source.slice(start,end).includes('trackAnalytics(')?2:0);
  context.state.selected.SYNTHETIC='L';
  vm.runInContext("addToCart('SYNTHETIC',{openDrawer:false})",context);
  assert.equal(context.state.cart.length,2);assert.equal(context.state.cart[1].talla,'L');
}
console.log('PASS quick add reuses the existing cart, rejects unavailable sizes and preserves the normal drawer flow');
