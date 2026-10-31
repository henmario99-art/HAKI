import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

class Element {
  constructor(tag='div'){
    this.tagName=tag.toUpperCase();this.nodeType=1;this.children=[];this.attrs=new Map();this.dataset={};this.listeners={};this.style={setProperty(){}};
    const names=new Set();this.classList={add:(...s)=>s.forEach(x=>names.add(x)),remove:(...s)=>s.forEach(x=>names.delete(x)),contains:x=>names.has(x)};
  }
  get className(){return this._class||'';} set className(s){this._class=s;this.classList.add(...s.split(' '));}
  getAttribute(k){return this.attrs.get(k)??null;} setAttribute(k,v){this.attrs.set(k,String(v));} removeAttribute(k){this.attrs.delete(k);} hasAttribute(k){return this.attrs.has(k);}
  toggleAttribute(k,v){if(v)this.setAttribute(k,'');else this.removeAttribute(k);}
  append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
  before(node){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,node);}
  remove(){if(this.parent)this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  querySelectorAll(){return [];} querySelector(){return null;} matches(){return false;}
  addEventListener(k,fn){(this.listeners[k]||=[]).push(fn);} emit(k,event={}){for(const fn of this.listeners[k]||[])fn(event);}
  getClientRects(){return this.hidden?[]:[{}];}
  animate(){return {finished:Promise.resolve(),cancel(){}};}
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const product={codigo:'SYNTHETIC',nombre:'Prenda de prueba'};
function catalog(cached){
  const events=new Element(),body=new Element(),nodes=new Map(),frames=new Map(),requests=[];let next=0;
  for(const id of ['catalogo','products','newProducts','latestProducts','collectionsGrid']){const el=new Element();el.id=id;nodes.set(id,el);body.append(el);}
  nodes.get('products').hidden=true;
  const storage=new Map();if(cached)storage.set('haki_online_catalog_definitivo_v1',JSON.stringify(cached));
  const document=new Element();Object.assign(document,{body,documentElement:new Element(),readyState:'loading',hidden:false,getElementById:id=>nodes.get(id),createElement:tag=>new Element(tag)});
  const ctx={document,window:events,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},matchMedia:()=>({matches:false,addEventListener(){}}),MutationObserver:class{observe(){}},setInterval(){},AbortSignal,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail;}},fetch:()=>new Promise((resolve,reject)=>requests.push({resolve,reject})),requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id)};
  events.dispatchEvent=e=>events.emit(e.type,e);events.HAKITheme={configure(){}};
  vm.createContext(ctx);
  for(const file of ['native-ui.js','online-catalog.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
  document.emit('DOMContentLoaded');
  return {body,nodes,requests,events,paint(){const f=[...frames.values()];frames.clear();f.forEach(fn=>fn());},holders:()=>body.children.filter(n=>n.className==='haki-catalog-placeholder'),errors:()=>body.children.filter(n=>n.className==='haki-catalog-error'),respond(data){requests.at(-1).resolve({ok:true,json:async()=>data});}};
}
test('Cold load reserves all four lists, ignores early stock events and removes placeholders on success',async()=>{
  const h=catalog();h.paint();assert.equal(h.holders().length,4);
  for(const id of ['products','newProducts','latestProducts','collectionsGrid'])assert.equal(h.nodes.get(id).getAttribute('aria-busy'),'true');
  h.events.dispatchEvent({type:'haki:catalog-updated',detail:{availability:true}});assert.equal(h.holders().length,4);
  const real=new Element();h.nodes.get('latestProducts').append(real);
  h.respond({config:{},products:[product]});await settle();
  assert.equal(h.holders().length,0);assert.equal(h.nodes.get('latestProducts').children[0],real,'do not replace rendered products');
  assert.equal(h.body.hasAttribute('data-haki-catalog-pending'),false);
  for(const id of ['products','newProducts','latestProducts','collectionsGrid'])assert.equal(h.nodes.get(id).hasAttribute('aria-busy'),false);
});
test('A legitimately empty catalogue ends loading and leaves the real empty state usable',async()=>{
  const h=catalog();h.paint();h.respond({config:{},products:[]});await settle();
  assert.equal(h.holders().length,0);assert.equal(h.errors().length,0);assert.equal(h.body.hasAttribute('data-haki-catalog-pending'),false);
});
test('Failure clears skeletons, offers one retry and recovers through the same loader',async()=>{
  const h=catalog();h.paint();h.requests[0].reject(Error('offline'));await settle();h.requests[1].reject(Error('fallback offline'));await settle();
  assert.equal(h.holders().length,0);assert.equal(h.errors().length,1);assert.equal(h.body.hasAttribute('data-haki-catalog-pending'),false);
  h.errors()[0].children[1].emit('click');h.paint();assert.equal(h.errors().length,0);assert.equal(h.holders().length,4);
  h.respond({config:{},products:[product]});await settle();assert.equal(h.holders().length,0);assert.equal(h.errors().length,0);
});
test('Cached results stay visible during a slow refresh and an outage',async()=>{
  const h=catalog({config:{},products:[product]});h.paint();assert.equal(h.holders().length,0);
  h.requests[0].reject(Error('offline'));await settle();h.requests[1].reject(Error('offline'));await settle();
  assert.equal(h.holders().length,0);assert.equal(h.errors().length,0);assert.equal(h.events.HAKI_PRODUCTOS[0].codigo,product.codigo);
});
test('The Comprar reveal waits for artwork and viewport, then stays revealed on refresh or re-entry',()=>{
  const hero=new Element(),image=new Element('img'),document=new Element(),mobile=new Element();let observer;
  image.complete=false;image.naturalWidth=0;mobile.matches=true;
  Object.assign(document,{readyState:'complete',getElementById:id=>id==='homeHero'?hero:id==='heroImage'?image:null,createElement:tag=>new Element(tag)});
  const ctx={document,matchMedia:()=>mobile,IntersectionObserver:class{constructor(fn){observer=this;this.fn=fn;}observe(){}disconnect(){this.disconnected=true;}}};
  vm.runInNewContext(readFileSync(new URL('../mobile-drop-hero.js',import.meta.url),'utf8'),ctx);
  const cta=hero.children[0];observer.fn([{isIntersecting:true}]);assert.equal(cta.classList.contains('is-revealed'),false);
  image.complete=true;image.naturalWidth=2160;image.naturalHeight=2700;image.emit('load');
  assert.equal(cta.classList.contains('is-revealed'),true);assert.equal(cta.classList.contains('is-awaiting-artwork'),false);assert.equal(observer.disconnected,true);
  image.emit('load');assert.equal(cta.href,'#nuevo-drop');assert.equal(cta.children[0].textContent,'Comprar');
});
