import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the real head loader and both existing catalog consumers together.
function runtime(cached) {
  const events = new Map(), storage = new Map(), requests = [], images = [];
  if (cached) storage.set('haki_cover_prefetch_v1', JSON.stringify({config:cached}));
  const listen = (name, fn) => events.set(name, [...(events.get(name) || []), fn]);
  const hero = {
    attrs: {}, style: {}, writes: 0,
    set src(value) { this.attrs.src=value; this.writes++; },
    get src() { return this.attrs.src; },
    getAttribute(key) { return this.attrs[key] ?? null; },
    removeAttribute(key) { delete this.attrs[key]; },
  };
  const ctx = {
    URL, AbortSignal, console, Date,
    navigator:{}, location:{pathname:'/'}, matchMedia:()=>({matches:false}),
    localStorage: {getItem:k=>storage.get(k) || null,setItem:(k,v)=>storage.set(k,v)},
    Image: class { constructor() { images.push(this); } },
    fetch: (url,options) => new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),
    setInterval:()=>0, setTimeout:()=>0,
    CustomEvent: class { constructor(type,options) { this.type=type;this.detail=options?.detail; } },
    Event: class { constructor(type) { this.type=type; } },
    document: {
      hidden:false, currentScript:{src:'https://haki-sv.netlify.app/cover-loader.js?v=1'},
      addEventListener:listen, createElement:()=>({}),head:{append(){}},
      getElementById: id => id==='heroImage' ? hero : null,
    },
    addEventListener:listen,
    dispatchEvent: event => { for(const fn of events.get(event.type)||[]) fn(event); },
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  const run = path => vm.runInContext(readFileSync(new URL('../'+path,import.meta.url),'utf8'),ctx);
  return {ctx,run,hero,requests,images,storage,events};
}
const config = {portadaOriginal:'https://example.com/original.jpg',portadaMobile:'https://example.com/small.jpg',portadaRevision:'cover-1',portadaOriginalWidth:4160,portadaOriginalHeight:1560};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
for (const loader of ['catalog-loader.js','app/catalog-loader.js']) {
  const t=runtime({...config,portadaOriginal:'https://example.com/old.jpg'});
  t.run('cover-loader.js');
  assert.equal(t.requests.length,1,'catalog starts in the head before DOMContentLoaded');
  assert.equal(t.images.length,1,'previous verified cover downloads speculatively');
  t.ctx.HAKI_COVER_WAITING_LIVE=true;
  t.ctx.HAKI_COVER.paint(t.hero,config);
  assert.equal(t.hero.src,undefined,'do not paint old/unverified cover');
  t.run(loader);
  t.ctx.dispatchEvent(new t.ctx.Event('DOMContentLoaded'));
  assert.equal(t.requests.length,1,'no duplicate catalog or initial inventory request');
  t.requests[0].resolve({ok:true,json:async()=>({config:{...config},products:[],version:'catalog-1'})});
  await settle();
  assert.equal(t.ctx.HAKI_COVER_WAITING_LIVE,false);
  t.ctx.HAKI_COVER.paint(t.hero,t.ctx.HAKI_CONFIG);
  const url='https://example.com/original.jpg?v=cover-1';
  assert.equal(t.hero.src,url);
  assert.equal(t.images[1].src,url,'preload and displayed cover use exactly the same URL');
  assert.equal(t.hero.getAttribute('srcset'),null,'never select undersized mobile variants');
  const writes=t.hero.writes;
  t.ctx.HAKI_COVER.paint(t.hero,{...config,catalogVersion:'sale-edited'});
  assert.equal(t.hero.writes,writes,'inventory/catalog changes do not reload the cover');
  // Legacy app fix must share the same source and must not strip its revision.
  t.run('app/native-android-cover-fix.js');
  assert.equal(t.hero.writes,writes);
  t.ctx.HAKI_COVER.paint(t.hero,{...config,portadaRevision:'cover-2'});
  assert.match(t.hero.src,/v=cover-2$/,'cover replacement invalidates cache');
  assert.equal(t.ctx.HAKI_COVER.source({...config,portadaOriginal:'images/new.jpg'}),'https://haki-sv.netlify.app/images/new.jpg?v=cover-1');
  console.log('PASS',loader,'early loading, single request, full resolution, stable URL, fresh cover');
}
for (const result of ['offline','invalid']) {
  const t=runtime();t.ctx.HAKI_CONFIG={...config};t.ctx.HAKI_PRODUCTOS=[];
  t.run('cover-loader.js');t.run('catalog-loader.js');
  t.ctx.dispatchEvent(new t.ctx.Event('DOMContentLoaded'));
  if(result==='offline')t.requests[0].reject(new Error('offline'));
  else t.requests[0].resolve({ok:true,json:async()=>({})});
  await settle();
  assert.equal(t.ctx.HAKI_COVER_WAITING_LIVE,false,'failure must release cover gate');
  t.ctx.HAKI_COVER.paint(t.hero,t.ctx.HAKI_CONFIG);
  assert.match(t.hero.src,/original.jpg/);
  console.log('PASS',result,'usable fallback');
}
