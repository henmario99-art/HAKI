import assert from 'node:assert/strict';
import handler from '../netlify/functions/catalog.mjs';
import {makeSession} from '../netlify/functions/_shared.mjs';

process.env.ADMIN_SESSION_SECRET='synthetic-cover-test-secret';
const headers={'content-type':'application/json',cookie:`haki_admin=${makeSession(process.env.ADMIN_SESSION_SECRET)}`};
const initial={config:{portadaOriginal:'pc.jpg',portadaMovil:'mobile.jpg',sentinel:{keep:true}},products:[{id:3,codigo:'TEST',nombre:'Prenda',imagen:'product.jpg'}],version:'version-1'};
const originalFetch=globalThis.fetch;
try {
  for(const [patch,sha,status] of [
    [{portadaMovil:'new-mobile.jpg',portadaMovilRevision:'mobile-2'},'version-1',200],
    [{portadaOriginal:'new-pc.jpg',portadaRevision:'pc-2'},'version-1',200],
    [{portadaMovil:'new-mobile.jpg'},'stale-version',409],
    [{portadaOriginal:'new-pc.jpg'},undefined,409],
  ]) {
    const writes=[];
    globalThis.fetch=async(url,options)=>{
      if(options.method==='GET') return Response.json(structuredClone(initial));
      assert.equal(options.method,'PUT');
      const body=JSON.parse(options.body);writes.push(body);
      assert.equal(body.expectedVersion,initial.version);
      assert.deepEqual(body.products,initial.products);
      assert.deepEqual(body.config,{...initial.config,...patch});
      return Response.json({config:body.config,products:body.products,version:'version-2'});
    };
    const response=await handler(new Request('https://local.test/.netlify/functions/catalog',{method:'PATCH',headers,body:JSON.stringify({config:patch,sha})}));
    assert.equal(response.status,status);
    const result=await response.json();
    if(status===200) {assert.equal(result.sha,'version-2');assert.equal(writes.length,1);}
    else {assert.equal(writes.length,0);assert.match(result.error,/Recarga/);}
  }
  console.log('PASS cover PATCH: preserve other artwork and products; reject stale or missing version before writes');
} finally {
  globalThis.fetch=originalFetch;
  delete process.env.ADMIN_SESSION_SECRET;
}
