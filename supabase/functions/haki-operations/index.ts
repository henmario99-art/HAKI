const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const NETLIFY_AUTH = 'https://haki-sv.netlify.app/.netlify/functions/auth';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type,x-haki-operations-token,authorization,apikey',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS });

async function db(path: string, options: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_ROLE,
      authorization: `Bearer ${SERVICE_ROLE}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  const bodyText = await response.text();
  let data: any = null;
  try { data = bodyText ? JSON.parse(bodyText) : null; } catch { data = bodyText; }
  if (!response.ok) throw new Error(data?.message || data?.error || `Database ${response.status}`);
  return data;
}

async function rpc(name: string, body: unknown) {
  return db(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('');
}

async function authorize(req: Request) {
  const token = req.headers.get('x-haki-operations-token') || '';
  if (!token) return false;
  const hash = await sha256(token);
  const now = new Date().toISOString();
  const cached = await db(`haki_sessions?token_hash=eq.${encodeURIComponent(hash)}&expires_at=gt.${encodeURIComponent(now)}&select=token_hash,expires_at`);
  if (Array.isArray(cached) && cached.length) {
    await db(`haki_sessions?token_hash=eq.${encodeURIComponent(hash)}`, {
      method: 'PATCH',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ last_used_at: now }),
    }).catch(() => {});
    return true;
  }

  const verify = await fetch(NETLIFY_AUTH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'verifyOperations', token }),
  });
  if (!verify.ok) return false;
  const result = await verify.json().catch(() => ({}));
  if (!result?.valid || !result?.expiresAt) return false;
  await db('haki_sessions?on_conflict=token_hash', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ token_hash: hash, expires_at: result.expiresAt, last_used_at: now }]),
  });
  return true;
}

function txt(value: unknown, max = 300) {
  return String(value ?? '').trim().slice(0, max);
}
function num(value: unknown, min = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, n) : min;
}
function integer(value: unknown, min = 0) {
  return Math.max(min, Math.trunc(num(value, min)));
}
function validDate(value: unknown) {
  const v = txt(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}
function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function mondayOf(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}
const SALE_STATES = new Set(['Pendiente','Retirado','Cancelado','No retirado']);
const MONEY_STATES = new Set(['Pendiente','En caja','No retiró']);
const SIZES = ['S','M','L','XL'];
const C807_GUIDE_COST = 4.15;

function isC807(value: unknown) { return txt(value, 80).toLowerCase().includes('c807'); }
function isPedidoExpress(value: unknown) { return txt(value, 80).toLowerCase().includes('pedido express'); }
function commission(amount: number) {
  if (amount <= 0) return 0;
  return amount <= 25 ? 1 : Number((amount * 0.04).toFixed(2));
}
function normalizeItem(item: any) {
  const productId = Number(item?.productId);
  const codigo = txt(item?.codigo, 80).toUpperCase();
  const nombre = txt(item?.nombre, 180);
  const talla = txt(item?.talla, 4).toUpperCase();
  const cantidad = integer(item?.cantidad, 1);
  const precio = num(item?.precio, 0);
  if (!Number.isFinite(productId) || productId <= 0) throw new Error('Producto inválido.');
  if (!codigo || !nombre) throw new Error('Falta el producto.');
  if (!SIZES.includes(talla)) throw new Error(`Talla inválida en ${codigo}.`);
  return { productId, codigo, nombre, talla, cantidad, precio: Number(precio.toFixed(2)) };
}
function normalizeSale(input: any, previous: any = null) {
  const fecha = validDate(input?.fecha);
  if (!fecha) throw new Error('Selecciona una fecha para la venta.');
  const items = Array.isArray(input?.items) ? input.items.map(normalizeItem) : [];
  if (!items.length) throw new Error('Agrega al menos una prenda a la venta.');
  const estado = SALE_STATES.has(input?.estado) ? input.estado : 'Pendiente';
  const dinero = MONEY_STATES.has(input?.dinero) ? input.dinero : 'Pendiente';
  const envio = num(input?.envio, 0);
  const subtotal = items.reduce((s:number,i:any)=>s+i.precio*i.cantidad,0);
  const total = Number((subtotal + envio).toFixed(2));
  const entrega = txt(input?.entrega || 'Pedido Express', 80);
  const c807 = isC807(entrega);
  const previousCommission = num(previous?.comisionC807, 0);
  let comisionC807 = 0;
  if (c807 && dinero === 'Pendiente') comisionC807 = commission(total);
  else if (c807 && dinero === 'En caja' && previousCommission > 0) comisionC807 = previousCommission;
  return {
    ...(previous || {}),
    ...input,
    fecha,
    canal: txt(input?.canal || 'Instagram', 50),
    fechaExpress: validDate(input?.fechaExpress) || '',
    fechaRetiro: validDate(input?.fechaRetiro) || '',
    cliente: txt(input?.cliente, 160),
    lugarHorario: txt(input?.lugarHorario, 320),
    destinoDriveId: txt(input?.destinoDriveId ?? previous?.destinoDriveId, 140),
    destinoImagen: txt(input?.destinoImagen ?? previous?.destinoImagen, 600),
    items,
    envio: Number(envio.toFixed(2)),
    subtotal: Number(subtotal.toFixed(2)),
    total,
    entrega,
    costoGuiaC807: c807 ? C807_GUIDE_COST : 0,
    comisionC807: Number(comisionC807.toFixed(2)),
    estado,
    etapaEnvio: ['Pedido tomado','Empacado','Enviado'].includes(input?.etapaEnvio) ? input.etapaEnvio : (previous?.etapaEnvio || 'Pedido tomado'),
    dinero,
    cobroSolicitadoAt: txt(input?.cobroSolicitadoAt || previous?.cobroSolicitadoAt, 50),
    cobroCanceladoAt: txt(input?.cobroCanceladoAt || previous?.cobroCanceladoAt, 50),
    notas: txt(input?.notas, 700),
  };
}

async function inventoryMap() {
  const rows = await db('haki_inventory?select=product_id,product_code,size,quantity');
  const out: Record<string, any> = {};
  for (const row of rows || []) {
    const stock = out[row.product_code] || out[String(row.product_id)] || { S:0,M:0,L:0,XL:0 };
    stock[row.size] = Number(row.quantity) || 0;
    if (row.product_code) out[row.product_code] = stock;
    if (row.product_id) out[String(row.product_id)] = stock;
  }
  return out;
}

async function migrated() {
  const rows = await db('haki_meta?key=eq.migration_v1&select=value');
  return !!(rows?.[0]?.value?.completed);
}

async function publicAvailability() {
  if (!(await migrated())) return { migrated:false, inventory:{} };
  return { migrated:true, inventory: await inventoryMap() };
}

async function importSnapshot(body: any) {
  if (await migrated()) return { ok:true, alreadyMigrated:true };

  const products = Array.isArray(body?.products) ? body.products : [];
  const productMap = new Map(products.map((p:any)=>[String(p.id), String(p.codigo || '').toUpperCase()]));
  const inventory = body?.snapshot?.inventory || {};
  const inventoryRows:any[] = [];
  for (const [productId, stock] of Object.entries(inventory)) {
    const code = productMap.get(String(productId));
    if (!code) continue;
    for (const size of SIZES) {
      inventoryRows.push({ product_id:Number(productId), product_code:code, size, quantity:integer((stock as any)?.[size],0) });
    }
  }
  if (inventoryRows.length) {
    await db('haki_inventory?on_conflict=product_code,size', {
      method:'POST',
      headers:{ prefer:'resolution=merge-duplicates,return=minimal' },
      body:JSON.stringify(inventoryRows),
    });
  }

  let salesCount = 0;
  for (const bucket of body?.snapshot?.weeks || []) {
    const list = Array.isArray(bucket?.sales) ? bucket.sales : [];
    const rows = list.filter((s:any)=>s?.id && validDate(s?.fecha)).map((s:any)=>({
      id:s.id, sale_date:s.fecha, payload:s, created_at:s.createdAt || new Date().toISOString(), updated_at:s.updatedAt || s.createdAt || new Date().toISOString()
    }));
    if (rows.length) {
      await db('haki_sales?on_conflict=id', {
        method:'POST',
        headers:{ prefer:'resolution=merge-duplicates,return=minimal' },
        body:JSON.stringify(rows),
      });
      salesCount += rows.length;
    }
  }

  let expensesCount = 0;
  for (const bucket of body?.snapshot?.expenses || []) {
    const list = Array.isArray(bucket?.expenses) ? bucket.expenses : [];
    const rows = list.filter((e:any)=>e?.id && validDate(e?.fecha)).map((e:any)=>({
      id:e.id, expense_date:e.fecha, payload:e, created_at:e.createdAt || new Date().toISOString(), updated_at:e.updatedAt || e.createdAt || new Date().toISOString()
    }));
    if (rows.length) {
      await db('haki_expenses?on_conflict=id', {
        method:'POST',
        headers:{ prefer:'resolution=merge-duplicates,return=minimal' },
        body:JSON.stringify(rows),
      });
      expensesCount += rows.length;
    }
  }

  await db('haki_meta?on_conflict=key', {
    method:'POST',
    headers:{ prefer:'resolution=merge-duplicates,return=minimal' },
    body:JSON.stringify([{ key:'migration_v1', value:{ completed:true, salesCount, expensesCount, inventoryRows:inventoryRows.length, completedAt:new Date().toISOString() } }]),
  });

  return { ok:true, salesCount, expensesCount, inventoryRows:inventoryRows.length };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('', { status:204, headers:CORS });
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') || 'week';

  try {
    if (req.method === 'GET' && mode === 'availability') return json(await publicAvailability());

    if (!(await authorize(req))) return json({ error:'No autorizado.' }, 401);

    if (req.method === 'GET' && mode === 'status') {
      const rows = await db('haki_meta?key=eq.migration_v1&select=value');
      return json({ migrated:!!rows?.[0]?.value?.completed, migration:rows?.[0]?.value || null });
    }

    if (req.method === 'POST' && mode === 'import') {
      return json(await importSnapshot(await req.json()), 201);
    }

    if (req.method === 'GET' && mode === 'inventory') return json({ inventory:await inventoryMap() });

    if (req.method === 'PUT' && mode === 'inventory') {
      const body = await req.json();
      const productCode = txt(body?.productCode,80).toUpperCase();
      const result = await rpc('haki_set_inventory', {
        p_product_code:productCode,
        p_product_id:Number(body?.productId),
        p_stock:body?.stock || {},
      });
      return json({ ok:true, stock:Array.isArray(result)?result[0]:result, inventory:await inventoryMap() });
    }

    if (req.method === 'GET' && mode === 'expenses') {
      const requested = validDate(url.searchParams.get('weekStart')) || mondayOf(new Date().toISOString().slice(0,10));
      const start = mondayOf(requested);
      const end = addDays(start,6);
      const rows = await db(`haki_expenses?expense_date=gte.${start}&expense_date=lte.${end}&select=payload&order=expense_date.desc`);
      return json({ weekStart:start, expenses:(rows||[]).map((r:any)=>r.payload) });
    }

    if (req.method === 'POST' && mode === 'expenses') {
      const body = await req.json();
      const input = body?.expense || body;
      const fecha = validDate(input?.fecha);
      const monto = num(input?.monto,0);
      if (!fecha || monto <= 0) throw new Error('Gasto inválido.');
      const id = input?.id || crypto.randomUUID();
      const now = new Date().toISOString();
      const expense = { ...input, id, fecha, monto:Number(monto.toFixed(2)), createdAt:now, updatedAt:now };
      await db('haki_expenses', { method:'POST', body:JSON.stringify([{ id, expense_date:fecha, payload:expense, created_at:now, updated_at:now }]) });
      return json({ ok:true, expense, weekStart:mondayOf(fecha) },201);
    }

    if (req.method === 'PUT' && mode === 'expenses') {
      const body = await req.json();
      const input = body?.expense || body;
      const id = txt(input?.id,80);
      const fecha = validDate(input?.fecha);
      const monto = num(input?.monto,0);
      if (!id || !fecha || monto <= 0) throw new Error('Gasto inválido.');
      const rows = await db(`haki_expenses?id=eq.${encodeURIComponent(id)}&select=payload`);
      const previous = rows?.[0]?.payload || {};
      const now = new Date().toISOString();
      const expense = { ...previous, ...input, id, fecha, monto:Number(monto.toFixed(2)), createdAt:previous.createdAt || now, updatedAt:now };
      await db(`haki_expenses?id=eq.${encodeURIComponent(id)}`, { method:'PATCH', headers:{prefer:'return=minimal'}, body:JSON.stringify({expense_date:fecha,payload:expense,updated_at:now}) });
      return json({ ok:true, expense, weekStart:mondayOf(fecha) });
    }

    if (req.method === 'DELETE' && mode === 'expenses') {
      const body = await req.json();
      const id = txt(body?.id,80);
      await db(`haki_expenses?id=eq.${encodeURIComponent(id)}`, { method:'DELETE', headers:{prefer:'return=minimal'} });
      return json({ ok:true });
    }

    if (req.method === 'GET' && mode === 'receivables') {
      const anchor = validDate(url.searchParams.get('anchor')) || new Date().toISOString().slice(0,10);
      const weeks = Math.min(52,Math.max(1,integer(url.searchParams.get('weeks') || 26,1)));
      const from = addDays(mondayOf(anchor), -(weeks-1)*7);
      const rows = await db(`haki_sales?sale_date=gte.${from}&sale_date=lte.${anchor}&select=payload&order=sale_date.desc`);
      const receivables = (rows||[]).map((r:any)=>r.payload).filter((sale:any)=>
        sale?.dinero === 'Pendiente' &&
        !['Cancelado','No retirado'].includes(sale?.estado) &&
        isPedidoExpress(sale?.entrega)
      ).map((sale:any)=>({...sale,weekStart:mondayOf(sale.fecha)}));
      return json({ receivables });
    }

    if (req.method === 'GET') {
      const requested = validDate(url.searchParams.get('weekStart')) || mondayOf(new Date().toISOString().slice(0,10));
      const start = mondayOf(requested);
      const end = addDays(start,6);
      const rows = await db(`haki_sales?sale_date=gte.${start}&sale_date=lte.${end}&select=payload&order=sale_date.asc`);
      return json({ weekStart:start, weekEnd:end, sales:(rows||[]).map((r:any)=>r.payload), inventory:await inventoryMap() });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const sale = normalizeSale(body?.sale || body);
      const result = await rpc('haki_create_sale',{p_sale:sale});
      const saved = Array.isArray(result) ? result[0] : result;
      return json({ ok:true, sale:saved, weekStart:mondayOf(saved.fecha) },201);
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await req.json();
      const input = body?.sale || body;
      const id = txt(input?.id,80);
      if (!id) throw new Error('Falta el identificador de la venta.');
      const rows = await db(`haki_sales?id=eq.${encodeURIComponent(id)}&select=payload`);
      const previous = rows?.[0]?.payload;
      if (!previous) throw new Error('No se encontró la venta.');
      let candidate = input;
      if (req.method === 'PATCH') {
        if (!['estado','etapaEnvio'].includes(body?.field)) throw new Error('Campo no permitido.');
        candidate = { ...previous, [body.field]:body.value };
      }
      const sale = normalizeSale(candidate, previous);
      sale.id = id;
      const result = await rpc('haki_update_sale',{p_sale:sale});
      const saved = Array.isArray(result) ? result[0] : result;
      return json({ ok:true, sale:saved, weekStart:mondayOf(saved.fecha), inventory:await inventoryMap() });
    }

    if (req.method === 'DELETE') {
      const body = await req.json();
      const id = txt(body?.id,80);
      if (!id) throw new Error('Falta el identificador de la venta.');
      await rpc('haki_delete_sale',{p_id:id});
      return json({ ok:true });
    }

    return json({ error:'Método no permitido.' },405);
  } catch (error) {
    console.error(error);
    return json({ error:(error as any)?.message || 'Error del servidor.' },400);
  }
});