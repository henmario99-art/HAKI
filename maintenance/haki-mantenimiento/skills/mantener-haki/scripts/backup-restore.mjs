import crypto from 'node:crypto';

const TABLES = new Set(['haki_admins','haki_expenses','haki_inventory','haki_meta','haki_recovery_snapshots','haki_sales','haki_sales_history','haki_sessions']);
const quote = value => '"' + String(value).replaceAll('"','""') + '"';
const literal = value => "'" + String(value).replaceAll("'","''") + "'";

export function renderApplicationSql(backup, rawTables = {}) {
  if (backup?.format !== 'haki-logical-backup-v1') throw Error('Formato de respaldo inválido.');
  if (!Array.isArray(backup.schema?.tables) || backup.schema.tables.some(t=>!TABLES.has(t.name))) throw Error('Tablas inesperadas.');
  if (backup.schema.tables.length !== TABLES.size || new Set(backup.schema.tables.map(t=>t.name)).size !== TABLES.size) throw Error('Esquema incompleto.');
  const sql = [
    '-- HAKI: respaldo lógico de la aplicación. Restaurar únicamente en un destino nuevo.',
    '-- No incluye secretos, Auth administrado por Supabase ni sesiones vigentes.',
    '-- Fecha UTC: ' + backup.captured_at,
    'BEGIN;',
    "SET LOCAL TIME ZONE 'UTC';",
    'DO $haki_guard$ BEGIN',
    ...[...TABLES].map(t=>"IF to_regclass('public."+t+"') IS NOT NULL THEN RAISE EXCEPTION 'El destino ya contiene tablas HAKI. Restauración cancelada.'; END IF;"),
    'END $haki_guard$;',
    'CREATE SCHEMA IF NOT EXISTS public;',
    "DO $haki_roles$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF; END $haki_roles$;",
    ...backup.schema.tables.map(t=>t.ddl)
  ];
  for (const [name,rows] of Object.entries(backup.data)) {
    if (!TABLES.has(name) || name==='haki_sessions') throw Error('Datos fuera del alcance del respaldo.');
    if (!Array.isArray(rows)) throw Error('Filas inválidas.');
    if (!rows.length) continue;
    const data=rawTables[name] || JSON.stringify(rows);
    if(JSON.parse(data).length!==rows.length)throw Error('Contenido de tabla inválido.');
    let tag;
    do { tag='$haki_'+crypto.randomBytes(12).toString('hex')+'$'; } while(data.includes(tag));
    sql.push('INSERT INTO public.'+quote(name)+' SELECT * FROM jsonb_populate_recordset(NULL::public.'+quote(name)+','+tag+data+tag+'::jsonb);');
  }
  sql.push(...(backup.schema.constraints||[]),...(backup.schema.indexes||[]));
  sql.push(...(backup.schema.routines||[]).map(f=>f.ddl.endsWith(';')?f.ddl:f.ddl+';'));
  sql.push(...(backup.schema.triggers||[]));
  for(const table of backup.schema.tables){
    sql.push('REVOKE ALL ON TABLE public.'+quote(table.name)+' FROM PUBLIC, anon, authenticated;');
    if(table.rls)sql.push('ALTER TABLE public.'+quote(table.name)+' ENABLE ROW LEVEL SECURITY;');
  }
  for(const g of backup.schema.table_grants||[]){
    if(!TABLES.has(g.table) || !/^(SELECT|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|MAINTAIN)$/.test(g.privilege))throw Error('Permiso de tabla inválido.');
    sql.push('GRANT '+g.privilege+' ON TABLE public.'+quote(g.table)+' TO '+(g.role==='PUBLIC'?'PUBLIC':quote(g.role))+';');
  }
  for(const f of backup.schema.routines||[]){
    sql.push('REVOKE ALL ON FUNCTION '+f.identity+' FROM PUBLIC, anon, authenticated;');
    for(const g of f.grants||[]){
      if(g.privilege!=='EXECUTE')throw Error('Permiso de función inválido.');
      sql.push('GRANT EXECUTE ON FUNCTION '+f.identity+' TO '+(g.role==='PUBLIC'?'PUBLIC':quote(g.role))+';');
    }
  }
  sql.push('COMMIT;');
  return sql.join('\n')+'\n';
}

export function cleanupExpiredSql(cutoff, { maxRows=2000, expectedCount, expectedFingerprint } = {}) {
  if (!Number.isFinite(Date.parse(cutoff)) || !Number.isInteger(maxRows) || maxRows<1 || maxRows>10000 ||
      !Number.isInteger(expectedCount) || expectedCount<1 || expectedCount>maxRows ||
      !/^[a-f0-9]{64}$/.test(expectedFingerprint || '')) throw Error('Alcance de limpieza inválido.');
  const limitDate=literal(cutoff)+"::timestamptz";
  const eligible="expires_at < "+limitDate+" AND expires_at < now()-interval '7 days'";
  return "WITH candidates AS MATERIALIZED (SELECT token_hash,expires_at FROM public.haki_sessions WHERE "+eligible+" ORDER BY expires_at,token_hash LIMIT "+maxRows+" FOR UPDATE), checked AS (SELECT count(*) AS count,encode(sha256(convert_to(coalesce(string_agg(token_hash,E'\\n' ORDER BY token_hash),''),'UTF8')),'hex') AS fingerprint FROM candidates), allowed AS (SELECT count="+expectedCount+" AND fingerprint="+literal(expectedFingerprint)+" AS ok FROM checked), deleted AS (DELETE FROM public.haki_sessions s USING candidates c,allowed a WHERE a.ok AND s.token_hash=c.token_hash AND s.expires_at=c.expires_at AND s.expires_at < "+limitDate+" AND s.expires_at < now()-interval '7 days' RETURNING s.token_hash) SELECT (SELECT ok FROM allowed) AS guard_passed,(SELECT count FROM checked) AS candidates,count(*)::integer AS deleted FROM deleted;";
}

export function extractRawTableData(text, names) {
  const ws = i => { while (/\s/.test(text[i] || '') && i < text.length) i++; return i; };
  function stringEnd(i) {
    if(text[i] !== '"') throw Error('Cadena JSON inválida.');
    for(i++;i<text.length;i++){if(text[i]==='\\'){i++;continue;}if(text[i]==='"')return i+1;}
    throw Error('Cadena JSON incompleta.');
  }
  function valueEnd(i) {
    if(text[i]==='"')return stringEnd(i);
    if(text[i]==='{' || text[i]==='['){
      let depth=0;
      for(;i<text.length;i++){
        if(text[i]==='"'){i=stringEnd(i)-1;continue;}
        if(text[i]==='{' || text[i]==='[')depth++;
        if(text[i]==='}' || text[i]===']'){depth--;if(depth===0)return i+1;}
      }
      throw Error('JSON incompleto.');
    }
    while(i<text.length && !/[\s,}\]]/.test(text[i]))i++;
    return i;
  }
  function propertyAt(start,key) {
    let i=ws(start);
    if(text[i]!=='{')throw Error('Se esperaba un objeto JSON.');
    i++;
    while(i<text.length){
      i=ws(i);if(text[i]==='}')break;
      const keyEnd=stringEnd(i), name=JSON.parse(text.slice(i,keyEnd));
      i=ws(keyEnd);if(text[i++]!==':')throw Error('Propiedad JSON inválida.');
      i=ws(i);const end=valueEnd(i);
      if(name===key)return [i,end];
      i=ws(end);if(text[i]===',')i++;else if(text[i]!=='}')throw Error('Objeto JSON inválido.');
    }
    throw Error('No se encontró '+key);
  }
  const [dataStart]=propertyAt(0,'data');
  return Object.fromEntries(names.map(name=>{const [start,end]=propertyAt(dataStart,name);return [name,text.slice(start,end)];}));
}
