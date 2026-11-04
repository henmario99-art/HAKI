import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assessUsage } from '../maintenance/haki-mantenimiento/skills/mantener-haki/scripts/usage-budget.mjs';

const policy=JSON.parse(await readFile(new URL('../maintenance/haki-mantenimiento/skills/mantener-haki/references/policy.json',import.meta.url),'utf8'));
const now=Date.parse('2026-11-04T21:00:00Z');
const base=()=>({
 measured_at:'2026-11-04T21:00:00Z', cycle_start:'2026-10-22T06:00:00Z', cycle_end:'2026-11-22T06:00:00Z',
 metrics:Object.fromEntries(Object.keys(policy.metrics).map(k=>[k,0])),grace:{active:false}
});
const run=s=>assessUsage(s,policy,now);
assert.equal(run(base()).status,'ok');
for(const [percent,status] of [[59.9,'ok'],[60,'notice'],[75,'warning'],[85,'critical'],[100,'critical']]){
 const s=base();s.metrics.database_bytes=policy.metrics.database_bytes.limit*percent/100;
 assert.equal(run(s).status,status);
}
{
 const s=base();s.metrics.cached_egress_bytes=null;
 assert.equal(run(s).status,'unknown');assert.equal(run(s).complete,false);
}
for(const invalid of [-1,'0',NaN,Infinity]) {
 const s=base();s.metrics.egress_bytes=invalid;
 assert.equal(run(s).metrics.find(m=>m.key==='egress_bytes').status,'unknown');
}
{
 const s=base();s.metrics.egress_bytes=4500000000;s.metrics.cached_egress_bytes=0;
 assert.equal(run(s).status,'critical'); // Independent quotas cannot offset each other.
}
{
 const s=base();s.metrics.cached_egress_bytes=2500000000;
 assert.equal(run(s).metrics.find(m=>m.key==='cached_egress_bytes').forecast_exceeds,true);
 assert.equal(run(s).status,'warning');
}
{
 const s=base();s.metrics.database_bytes=250000000;
 assert.equal(run(s).metrics.find(m=>m.key==='database_bytes').projected_percent,null);
}
{
 const s=base();s.metrics.log_query_bytes=555000000000;
 assert.equal(run(s).status,'ok');assert.equal(run(s).metrics.find(m=>m.key==='log_query_bytes').status,'informational');
}
{
 const s=base();s.grace={active:true,ends_date:'2026-11-06'};
 assert.equal(run(s).status,'warning');
 const missing=base();missing.grace=null;assert.equal(run(missing).status,'unknown');
}
{
 const s=base();s.measured_at='2026-11-02T21:00:00Z';assert.equal(run(s).status,'unknown');
 const bad=base();bad.cycle_end='2026-11-01T06:00:00Z';assert.equal(run(bad).status,'unknown');
 const nozone=base();nozone.measured_at='2026-11-04T21:00:00';assert.equal(run(nozone).status,'unknown');
 const future=base();future.measured_at='2026-11-05T21:00:00Z';assert.equal(run(future).status,'unknown');
}
assert.throws(()=>assessUsage(base(),{...policy,thresholds:[85,60,75]},now),/Umbrales/);
console.log('PASS: thresholds, independent quotas, missing/stale metrics, forecast, grace, informational logs.');
