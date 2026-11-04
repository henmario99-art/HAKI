import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sources=Object.fromEntries(['online-catalog.js','app/catalog-loader.js'].map(path=>[path,readFileSync(new URL('../'+path,import.meta.url),'utf8')]));

const product=()=>({codigo:'ONE',nombre:'Prenda',tallas:{S:true,M:false,L:false,XL:false},stockPorTalla:{S:2,M:0,L:0,XL:0},stockTotal:2});
const catalogData=()=>({config:{},products:[product()]});
const stockData=quantity=>({migrated:true,inventory:{ONE:{S:quantity,M:0,L:0,XL:0}}});
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function bus(){
  const listeners=new Map();
  return {addEventListener(type,fn){const list=listeners.get(type)||[];list.push(fn);listeners.set(type,list);},
    emit(type,event={}){for(const fn of listeners.get(type)||[])fn(event);},
    dispatchEvent(event){this.emit(event.type,event);}};
}
function harness(installed=false,{cached=false,hidden=false}={}){
  let now=0;const requests=[],intervals=[],timers=[];
  const window=bus(),document=bus(),storage=new Map();
  Object.assign(document,{hidden,readyState:'loading',head:{append(){},appendChild(){}},createElement:()=>({remove(){}})});
  Object.assign(window,{HAKITheme:{configure(){}},HAKI_CONFIG:{},HAKI_PRODUCTOS:installed?[product()]:[]});
  if(cached)storage.set('haki_online_catalog_definitivo_v1',JSON.stringify(catalogData()));
  const scope={window,document,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    Date:{now:()=>now},AbortSignal:{timeout:()=>undefined},
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},
    setInterval:(fn,ms)=>{intervals.push({fn,ms});return intervals.length;},
    setTimeout:(fn,ms)=>{timers.push({fn,at:now+ms});return timers.length;},
    fetch:(url)=>new Promise((resolve,reject)=>requests.push({url,resolve,reject,kind:String(url).includes('mode=availability')?'stock':'catalog'}))};
  Function(...Object.keys(scope),sources[installed?'app/catalog-loader.js':'online-catalog.js'])(...Object.values(scope));
  document.emit('DOMContentLoaded');window.emit('DOMContentLoaded');
  return {window,document,requests,intervals,storage,
    count:kind=>requests.filter(r=>r.kind===kind).length,
    advance:ms=>{now+=ms;},
    returnToTab(){document.hidden=false;document.emit('visibilitychange');window.emit('focus');},
    respond(kind,data){const request=requests.find(r=>r.kind===kind&&!r.done);if(!request)throw Error('No pending '+kind);request.done=true;request.resolve({ok:true,json:async()=>data});},
    fail(kind){const request=requests.find(r=>r.kind===kind&&!r.done);if(!request)throw Error('No pending '+kind);request.done=true;request.reject(Error('offline'));},
    runInterval(ms){const timer=intervals.find(t=>t.ms===ms);if(!timer)throw Error('Missing interval '+ms);timer.fn();},
    flushTimers(){for(let guard=0;guard<50;guard++){const i=timers.findIndex(t=>t.at<=now);if(i<0)return;timers.splice(i,1)[0].fn();}throw Error('Timer loop');}};
}

test('Online: cached data still triggers a live load and concurrent return events share the pending request',async()=>{
  const h=harness(false,{cached:true});
  for(let i=0;i<20;i++)h.returnToTab();
  assert.equal(h.count('catalog'),1);
  assert.equal(h.window.HAKI_PRODUCTOS.length,1);
  h.respond('catalog',catalogData());await settle();
  assert.equal(h.window.HAKI_CATALOG_READY,true);
});
test('Online: quick tab returns reuse fresh data, while a later return and the minute timer refresh',async()=>{
  const h=harness();h.respond('catalog',catalogData());await settle();
  h.advance(29999);for(let i=0;i<20;i++)h.returnToTab();
  assert.equal(h.count('catalog'),1);
  h.advance(1);h.returnToTab();assert.equal(h.count('catalog'),2);
  h.respond('catalog',catalogData());await settle();
  h.advance(30000);h.runInterval(60000);assert.equal(h.count('catalog'),3);
  const changed=catalogData();changed.products[0].stockTotal=0;
  h.respond('catalog',changed);await settle();
  assert.equal(h.window.HAKI_PRODUCTOS[0].stockTotal,0);
});
test('Online: explicit refresh bypasses the cooldown and a failed refresh permits an immediate automatic retry',async()=>{
  const h=harness();h.respond('catalog',catalogData());await settle();
  h.advance(1);h.window.HAKIRefreshCatalog();assert.equal(h.count('catalog'),2);
  h.fail('catalog');await settle();assert.equal(h.count('catalog'),3);
  assert.equal(h.requests.at(-1).url,'/.netlify/functions/public-catalog');
  h.fail('catalog');await settle();h.returnToTab();assert.equal(h.count('catalog'),4);
  h.respond('catalog',catalogData());await settle();
  assert.equal(h.window.HAKI_CATALOG_READY,true);
});
test('Online: hidden pages make no requests; becoming visible can complete the first load',async()=>{
  const h=harness(false,{hidden:true});h.runInterval(60000);h.window.HAKIRefreshCatalog();
  assert.equal(h.count('catalog'),0);
  h.returnToTab();assert.equal(h.count('catalog'),1);
  h.respond('catalog',catalogData());await settle();
});
test('Online: a valid empty catalog is fresh, with no unnecessary return requests',async()=>{
  const h=harness();h.respond('catalog',{config:{},products:[]});await settle();
  h.returnToTab();assert.equal(h.count('catalog'),1);assert.equal(h.window.HAKI_CATALOG_READY,true);
  assert.equal(h.window.HAKI_PRODUCTOS.length,0);
});
test('Installed: startup and catalog events do not queue a second stock request behind the first one',async()=>{
  const h=harness(true);assert.equal(h.count('catalog'),1);assert.equal(h.count('stock'),1);
  h.respond('catalog',catalogData());await settle();
  h.advance(150);h.flushTimers();h.returnToTab();
  h.respond('stock',stockData(3));await settle();h.flushTimers();
  assert.equal(h.count('stock'),1);assert.equal(h.count('catalog'),1);
  assert.equal(h.window.HAKI_PRODUCTOS[0].stockTotal,3);
  h.window.dispatchEvent({type:'haki:catalog-updated',detail:{live:true}});
  h.advance(150);h.flushTimers();assert.equal(h.count('stock'),1);
});
test('Installed: short returns reuse catalog and stock, longer returns still update both',async()=>{
  const h=harness(true);h.respond('catalog',catalogData());h.respond('stock',stockData(2));await settle();
  h.advance(4000);h.flushTimers();for(let i=0;i<10;i++)h.returnToTab();
  assert.equal(h.count('stock'),1);assert.equal(h.count('catalog'),1);
  h.advance(1000);h.returnToTab();assert.equal(h.count('stock'),2);assert.equal(h.count('catalog'),1);
  h.respond('stock',stockData(0));await settle();assert.equal(h.window.HAKI_PRODUCTOS[0].stockTotal,0);
  assert.equal(h.window.HAKI_PRODUCTOS[0].tallas.S,false);
  h.advance(25000);h.returnToTab();assert.equal(h.count('catalog'),2);assert.equal(h.count('stock'),3);
});
test('Installed: explicit stock refresh and its trailing refresh remain immediate',async()=>{
  const h=harness(true);h.respond('catalog',catalogData());h.respond('stock',stockData(2));await settle();
  h.window.HAKI_REFRESH_AVAILABILITY();assert.equal(h.count('stock'),2);
  h.window.HAKI_REFRESH_AVAILABILITY();assert.equal(h.count('stock'),2);
  h.respond('stock',stockData(1));await settle();h.flushTimers();assert.equal(h.count('stock'),3);
  h.respond('stock',stockData(0));await settle();assert.equal(h.window.HAKI_PRODUCTOS[0].stockTotal,0);
});
test('Installed: stock failures and invalid responses permit immediate automatic retries',async()=>{
  const h=harness(true);h.respond('catalog',catalogData());h.respond('stock',stockData(2));await settle();
  h.window.HAKI_REFRESH_AVAILABILITY();h.fail('stock');await settle();h.returnToTab();assert.equal(h.count('stock'),3);
  h.respond('stock',{});await settle();h.returnToTab();assert.equal(h.count('stock'),4);
  h.respond('stock',stockData(1));await settle();assert.equal(h.window.HAKI_PRODUCTOS[0].stockTotal,1);
});
test('Installed: failed catalog refresh allows a prompt retry even after a recent success',async()=>{
  const h=harness(true);h.respond('catalog',catalogData());h.respond('stock',stockData(2));await settle();
  h.runInterval(300000);h.fail('catalog');await settle();h.returnToTab();assert.equal(h.count('catalog'),3);
  h.respond('catalog',catalogData());await settle();
});
test('Installed: periodic stock/catalog updates retain their cadence and pause while hidden',async()=>{
  const h=harness(true);h.respond('catalog',catalogData());h.respond('stock',stockData(2));await settle();
  h.document.hidden=true;h.runInterval(45000);h.runInterval(300000);assert.equal(h.count('stock'),1);assert.equal(h.count('catalog'),1);
  h.document.hidden=false;h.advance(45000);h.runInterval(45000);assert.equal(h.count('stock'),2);
  h.respond('stock',stockData(0));await settle();assert.equal(h.window.HAKI_PRODUCTOS[0].stockTotal,0);
  h.advance(255000);h.runInterval(300000);assert.equal(h.count('catalog'),2);
});

