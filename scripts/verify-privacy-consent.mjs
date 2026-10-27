import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../privacy-preferences.js',import.meta.url),'utf8');
const key='haki_privacy_preferences_v1';
const noticeRevision='2026-10-27.1';
const saved=(preferences,extra={})=>JSON.stringify({necessary:true,preferences,analytics:false,marketing:false,version:'2026-10-27.2',noticeRevision,savedAt:new Date().toISOString(),...extra});
function boot(initial={},blocked=false,pathname='/'){
 const values=new Map(Object.entries(initial)),events={},notifications=[];
 const localStorage={getItem:k=>values.get(k)||null,setItem(k,v){if(blocked)throw Error('Storage blocked');values.set(k,String(v));},removeItem(k){if(blocked)throw Error('Storage blocked');values.delete(k)}};
 const window={addEventListener:(name,fn)=>events[name]=fn};
 const document={readyState:'loading',documentElement:{dataset:{theme:'oscuro'}},addEventListener(){},dispatchEvent:e=>notifications.push(e)};
 vm.runInNewContext(source,{window,document,localStorage,location:{pathname},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}}});
 return {api:window.HAKI_PRIVACY,window,values,events,notifications};
}
let env=boot({haki_cart_v1:'[{"codigo":"HAKI","talla":"M","cantidad":1}]',haki_store_theme_v1:'oscuro',haki_theme_v1:'claro'});
assert.equal(env.api.allows('preferences'),false);
assert.equal(env.api.getPreferences().decided,false);
assert.equal(env.values.has('haki_store_theme_v1'),false);
assert.equal(env.values.get('haki_theme_v1'),'claro','public privacy choices must preserve the administrator theme');
assert.equal(env.values.has('haki_cart_v1'),true,'privacy defaults must preserve the bag');
assert.equal(env.window.HAKI_ANALYTICS_CONSENT,false);
env.api.setPreferences({preferences:true,analytics:true,marketing:true});
assert.equal(env.api.allows('preferences'),true);
assert.equal(env.values.get('haki_store_theme_v1'),'oscuro');
assert.equal(env.api.allows('analytics'),false);
assert.equal(env.api.allows('marketing'),false);
assert.equal(env.window.HAKI_ANALYTICS_CONSENT,false,'acceptance must not activate an unconfigured tracker');
const receipt=JSON.parse(env.values.get(key));
assert.deepEqual(Object.keys(receipt).sort(),['necessary','preferences','analytics','marketing','version','noticeRevision','savedAt'].sort());
env=boot(Object.fromEntries(env.values));
assert.equal(env.api.allows('preferences'),true,'the browser must remember the explicit choice');
env.api.setPreferences({preferences:false});
assert.equal(env.values.has('haki_store_theme_v1'),false,'revocation must remove the optional preference');
assert.equal(env.values.has('haki_cart_v1'),true);
assert.equal(boot(Object.fromEntries(env.values)).api.allows('preferences'),false);
for(const raw of ['bad json',saved(true,{version:'old'}),saved(true,{savedAt:'2000-01-01'}),saved(true,{savedAt:'2099-01-01'}),saved(true,{preferences:'true'}),saved(true,{analytics:true})]){
 const invalid=boot({[key]:raw});assert.equal(invalid.api.getPreferences().decided,false);assert.equal(invalid.api.allows('preferences'),false);
}
// Every previous acceptance or rejection must be renewed once; either new decision persists.
for(const previous of [true,false]){
 for(const renewed of [true,false]){
  const bag='[{"codigo":"HAKI","talla":"M","cantidad":1}]';
  const returning=boot({[key]:saved(previous,{noticeRevision:undefined}),haki_cart_v1:bag,haki_store_theme_v1:'oscuro',haki_theme_v1:'claro'});
  assert.equal(returning.api.getPreferences().decided,false,'previous visitors must see the renewed notice');
  assert.equal(returning.api.allows('preferences'),false,'optional persistence requires the renewed decision');
  assert.equal(returning.values.get('haki_cart_v1'),bag,'renewal must preserve the entire bag');
  assert.equal(returning.values.get('haki_theme_v1'),'claro','renewal must preserve the administrator theme');
  returning.api.setPreferences({preferences:renewed});
  const nextVisit=boot(Object.fromEntries(returning.values));
  assert.equal(nextVisit.api.getPreferences().decided,true,'the renewed decision must suppress the notice on the next visit');
  assert.equal(nextVisit.api.allows('preferences'),renewed,'both acceptance and rejection must persist');
  assert.equal(JSON.parse(nextVisit.values.get(key)).noticeRevision,noticeRevision);
 }
}
const wrongRevision=boot({[key]:saved(true,{noticeRevision:'previous'})});
assert.equal(wrongRevision.api.getPreferences().decided,false,'a superseded notice revision must be renewed');
const limited=boot({},true);assert.equal(limited.api.setPreferences({preferences:true}).persisted,false);assert.equal(limited.api.allows('preferences'),true,'blocked storage only permits a page-scoped choice');
const app=boot({},false,'/app/');app.api.setPreferences({preferences:true});assert.equal(app.values.get('haki_store_theme_v1'),'oscuro');
app.values.set(key,saved(false));app.events.storage({key});assert.equal(app.api.allows('preferences'),false,'revocation in another tab must apply');
app.api.reset();assert.equal(app.api.getPreferences().decided,false);assert.equal(app.values.has(key),false);
const themeCode=fs.readFileSync(new URL('../experience-config.js',import.meta.url),'utf8');
const themeSetup=themeCode.slice(themeCode.indexOf('const isAdminTheme'),themeCode.indexOf('const themeIcon'));
for(const [pathname,allowed,expected] of [['/admin/index.html',false,'oscuro'],['/',false,undefined],['/',true,'claro']]){
 const document={documentElement:{dataset:{}}};
 vm.runInNewContext(themeSetup,{location:{pathname},document,window:{HAKI_PRIVACY:{allows:()=>allowed}},localStorage:{getItem:k=>k==='haki_theme_v1'?'oscuro':'claro'}});
 assert.equal(document.documentElement.dataset.theme,expected,'public privacy choices must not alter administrator theme behavior');
}
for(const path of ['index.html','app/index.html','cookies.html','privacidad.html','terminos.html','envios.html','domicilios.html','encomiendas.html','cambios-devoluciones.html','reclamaciones.html','app/domicilios.html','app/encomiendas.html']){
 const html=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
 assert.match(html,/privacy-preferences\.js\?v=20261027-6/);
 assert.match(html,/privacy-preferences\.css\?v=20261027-4/);
 assert.match(html,/<meta name="robots" content="noindex">/);
 if(path==='index.html')assert.ok(html.indexOf('privacy-preferences.js')<html.indexOf('haki_store_theme_v1'));
}
assert.match(fs.readFileSync(new URL('../experience-config.js',import.meta.url),'utf8'),/const canRememberTheme=\(\)=>isAdminTheme \|\|/);
console.log('PASS: reject/accept/persistence/revocation, unchanged bag, no trackers, malformed and expired choices, blocked storage, installed app, cross-tab changes and all public entry pages and one-time renewal of previous acceptance/rejection.');
