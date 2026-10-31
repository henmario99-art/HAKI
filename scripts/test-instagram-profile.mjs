import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

for(const path of ['../storefront-config.js','../app/storefront-config.js']){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  const end=source.indexOf('// Defaults are shared');assert(end>0);
  const context={window:{}};vm.createContext(context);vm.runInContext(source.slice(0,end),context);
  const {hakiInstagramHandle:handle,hakiInstagramProfileUrl:url}=context.window;
  for(const config of [{},{instagram:''},{instagram:'hakisv1'},{instagram:'@Haki__sv'}]){
    assert.equal(handle(config),'Haki__sv');assert.equal(url(config),'https://www.instagram.com/haki__sv/');
  }
  assert.equal(handle({instagram:'@OtraCuenta'}),'OtraCuenta');
  assert.equal(url({instagram:'@OtraCuenta'}),'https://www.instagram.com/otracuenta/');
}
console.log('PASS: current and legacy settings resolve to haki__sv; future profile settings are preserved');
