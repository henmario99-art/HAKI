import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import auth from '../netlify/functions/auth.mjs';
import {makeSession,makeOperationsToken} from '../netlify/functions/_shared.mjs';

process.env.ADMIN_SESSION_SECRET='synthetic-private-preview-secret';
const secret=process.env.ADMIN_SESSION_SECRET;
const script=readFileSync(new URL('../drop-launch.js',import.meta.url),'utf8');
const launch=Date.parse('2026-10-31T10:00:00-06:00');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function runtime({query='?preview=1',cookie='',failure='',now=launch-60000}={}) {
  const events=new Map(),redirects=[],styles=[],requests=[];
  const state={cookie,now};
  const listen=(event,fn)=>events.set(event,[...(events.get(event)||[]),fn]);
  const context={
    URLSearchParams,AbortSignal,
    Date:{parse:Date.parse,now:()=>state.now},
    location:{pathname:'/',search:query,replace:value=>redirects.push(value)},
    document:{hidden:false,head:{append:style=>styles.push(style)},createElement:()=>({removed:false,remove(){this.removed=true;}}),addEventListener:listen},
    addEventListener:listen,
    fetch:async(url,options)=>{
      requests.push({url,options});
      assert.equal(url,'/.netlify/functions/auth');
      assert.equal(options.credentials,'same-origin');
      assert.equal(options.cache,'no-store');
      if(failure==='network')throw new Error('offline');
      if(failure==='server')return {ok:false};
      if(failure==='string')return {ok:true,json:async()=>({authenticated:'true'})};
      return auth(new Request('https://local.test/.netlify/functions/auth',{headers:{cookie:state.cookie}}));
    },
  };
  context.window=context;
  vm.runInNewContext(script,context);
  return {state,events,redirects,styles,requests};
}
try {
  const valid=`haki_admin=${makeSession(secret)}`;
  for(const cookie of ['',valid+'tampered',`haki_admin=${makeOperationsToken(secret)}`]) {
    const t=runtime({cookie});await settle();
    assert.deepEqual(t.redirects,['/nuevo-drop']);
    assert.equal(t.styles[0].removed,false,'unauthenticated content stays hidden');
  }
  for(const failure of ['network','server','string']) {
    const t=runtime({failure});await settle();
    assert.deepEqual(t.redirects,['/nuevo-drop']);
  }
  const t=runtime({cookie:valid});
  assert.equal(t.styles[0].removed,false,'hide content while checking the session');
  await settle();
  assert.deepEqual(t.redirects,[]);assert.equal(t.styles[0].removed,true);
  t.state.cookie='';
  for(const fn of t.events.get('focus'))fn();
  await settle();
  assert.deepEqual(t.redirects,['/nuevo-drop'],'signing out revokes the preview when returning to the tab');
  const publicView=runtime({cookie:valid,query:''});await settle();
  assert.deepEqual(publicView.redirects,['/nuevo-drop']);assert.equal(publicView.requests.length,0);
  const launched=runtime({now:launch});await settle();
  assert.equal(launched.redirects.length,0);assert.equal(launched.requests.length,0);assert.equal(launched.styles.length,0);
  console.log('PASS private preview: signed admin session required, hidden pending authentication, denial/failure closed, logout recheck, countdown unchanged, public launch unaffected');
} finally {delete process.env.ADMIN_SESSION_SECRET;}
