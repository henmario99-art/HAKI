import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DAY = 86400000;
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const instant = value => typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;

export function assessUsage(snapshot, policy, now = Date.now()) {
  if (!snapshot || !policy?.metrics) throw new TypeError('Se requiere medición y política.');
  if (!Array.isArray(policy.thresholds) || policy.thresholds.length !== 3 ||
      policy.thresholds.some((x,i,a) => !finite(x) || x <= 0 || (i && x <= a[i-1]))) {
    throw new TypeError('Umbrales inválidos.');
  }
  if (!finite(policy.max_age_hours) || policy.max_age_hours <= 0) throw new TypeError('Antigüedad inválida.');
  const measured = instant(snapshot.measured_at);
  const fresh = Number.isFinite(measured) && now - measured <= policy.max_age_hours * 3600000 && measured - now <= 300000;
  const start = instant(snapshot.cycle_start), end = instant(snapshot.cycle_end);
  const validCycle = Number.isFinite(start) && Number.isFinite(end) && end > start && measured >= start && measured < end && now < end;
  const warnings = [];
  if (!fresh) warnings.push('Medición vencida o fecha inválida: actualizar antes de concluir.');
  const results = Object.entries(policy.metrics).map(([key, rule]) => {
    if (!finite(rule.limit) || rule.limit <= 0) throw new TypeError('Cuota inválida: ' + key);
    const used = snapshot.metrics?.[key];
    const valid = fresh && finite(used) && (rule.mode !== 'cumulative' || validCycle);
    if (!valid) {
      return { key, label:rule.label, status:'unknown', used:null, limit:rule.limit, required:rule.required === true };
    }
    const percent = used / rule.limit * 100;
    const level = percent >= policy.thresholds[2] ? 'critical' :
      percent >= policy.thresholds[1] ? 'warning' : percent >= policy.thresholds[0] ? 'notice' : 'ok';
    let projected_percent = null;
    // A cycle-to-date linear estimate, never apply it to stored bytes or peak connections.
    if (rule.mode === 'cumulative' && measured - start >= DAY) {
      projected_percent = percent * (end - start) / (measured - start);
    }
    const forecast_exceeds = projected_percent !== null && projected_percent >= 100;
    return {
      key, label:rule.label, used, limit:rule.limit, percent,
      status:rule.enforced === false ? 'informational' : level,
      observed_level:level, enforced:rule.enforced !== false,
      forecast_exceeds, projected_percent,
      projection_kind:projected_percent === null ? null : 'initial_linear_estimate'
    };
  });
  const incomplete = results.some(r => r.status === 'unknown' && r.required);
  const graceKnown = fresh && typeof snapshot.grace?.active === 'boolean';
  const activeGrace = graceKnown && snapshot.grace.active;
  if (!graceKnown) warnings.push('No se verificó el estado de prórroga/restricción.');
  if (activeGrace) warnings.push('Aviso de prórroga activo: ' + (snapshot.grace.ends_date || 'fecha sin verificar') + '. Verificar el aviso vigente aunque el ciclo actual esté bajo cuota.');
  const enforced = results.filter(r => r.enforced);
  const status = enforced.some(r=>r.status==='critical') ? 'critical' :
    activeGrace || enforced.some(r=>r.status==='warning'||r.forecast_exceeds) ? 'warning' :
    enforced.some(r=>r.status==='notice') ? 'notice' :
    incomplete || !graceKnown ? 'unknown' : 'ok';
  return { measured_at:snapshot.measured_at, fresh, complete:!incomplete && graceKnown, status, active_grace:!!activeGrace, warnings, metrics:results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 4) throw new Error('Uso: node usage-budget.mjs medicion.json policy.json');
    const snapshot = JSON.parse(await readFile(process.argv[2], 'utf8'));
    const policy = JSON.parse(await readFile(process.argv[3], 'utf8'));
    console.log(JSON.stringify(assessUsage(snapshot,policy),null,2));
  } catch(error) { console.error(error.message); process.exitCode = 1; }
}
