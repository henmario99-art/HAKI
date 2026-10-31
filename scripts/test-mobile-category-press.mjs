import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// A touch on a category must not transform its scroll-snap target before click.
// Other controls must retain their existing press feedback and cancel behavior.
const handlers=new Map();
const listen=(name,fn)=>handlers.set(name,[...(handlers.get(name)||[]),fn]);
const context={
  document:{addEventListener:listen,readyState:'loading',documentElement:{}},
  MutationObserver:class{observe(){}},
  matchMedia:()=>({matches:false,addEventListener(){}}),
  CSS:{supports:()=>true},
  addEventListener:listen,
};
context.window=context;
vm.runInNewContext(readFileSync(new URL('../native-ui.js',import.meta.url),'utf8'),context);
function control(optOut=false){
  const classes=new Set();let animations=0,mutations=0;
  return {
    classes,
    get animations(){return animations;},get mutations(){return mutations;},
    classList:{add(...names){mutations++;names.forEach(n=>classes.add(n));},remove(...names){mutations++;names.forEach(n=>classes.delete(n));}},
    matches:()=>false,
    closest:selector=>optOut&&selector.includes('data-haki-press')?{}:null,
    animate(){animations++;return {finished:Promise.resolve(),cancel(){}};}
  };
}
function send(name,target,pointerId=1,extra={}){
  const event={pointerId,isPrimary:true,button:0,clientX:80,clientY:300,target:{closest:()=>target},...extra};
  for(const handler of handlers.get(name)||[])handler(event);
}
const category=control(true);
send('pointerdown',category);send('pointerup',category);
assert.equal(category.mutations,0,'category touch must not mutate a pressed class');
assert.equal(category.animations,0,'category release must not animate its snap geometry');
const button=control();
send('pointerdown',button,2);assert(button.classes.has('haki-pressed'));
send('pointerup',button,2);assert(!button.classes.has('haki-pressed'));
assert.equal(button.animations,1,'ordinary controls keep their feedback');
send('pointerdown',button,3);send('pointercancel',button,3);
assert(!button.classes.has('haki-pressed'),'cancelled touch must not remain pressed');
await new Promise(resolve=>setImmediate(resolve));
console.log('PASS category taps do not transform the carousel; normal controls and cancellation retain press feedback');
