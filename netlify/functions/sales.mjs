import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { json, bodyJson, verifyAdmin, makeOperationsToken, github, repoParts, BRANCH } from './_shared.mjs';

const STORE_NAME = 'haki-private-sales';
const INVENTORY_KEY = 'inventory';
const SIZES = ['S', 'M', 'L', 'XL'];
const SALE_STATES = new Set(['Pendiente', 'Retirado', 'Cancelado', 'No retirado']);
const MONEY_STATES = new Set(['Pendiente', 'En caja', 'No retiró']);
const C807_GUIDE_COST = 4.15;

function store() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function text(value, max = 200) {
  return String(value ?? '').trim().slice(0, max);
}

function number(value, min = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? Math.max(min, result) : min;
}

function int(value, min = 0) {
  return Math.max(min, Math.trunc(number(value, min)));
}

function validDate(value) {
  const date = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? '' : date;
}

function validTimestamp(value) {
  const raw = text(value, 40);
  if (!raw) return '';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function weekStartFor(dateValue) {
  const iso = validDate(dateValue);
  if (!iso) throw new Error('Fecha inválida.');
  const date = new Date(`${iso}T12:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function addDays(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekKey(weekStart) {
  return `week/${weekStart}`;
}

function expenseKey(weekStart) {
  return `expenses/${weekStart}`;
}

function normalizeStock(value = {}) {
  return Object.fromEntries(SIZES.map(size => [size, int(value?.[size], 0)]));
}

function normalizeItem(item, index) {
  const productId = Number(item?.productId);
  const codigo = text(item?.codigo, 80);
  const nombre = text(item?.nombre, 160);
  const talla = text(item?.talla, 4).toUpperCase();
  const cantidad = int(item?.cantidad, 1);
  const precio = number(item?.precio, 0);
  if (!Number.isFinite(productId) || productId <= 0) throw new Error(`Producto inválido en la línea ${index + 1}.`);
  if (!codigo || !nombre) throw new Error(`Falta el producto en la línea ${index + 1}.`);
  if (!SIZES.includes(talla)) throw new Error(`Talla inválida en ${codigo}.`);
  if (cantidad < 1) throw new Error(`Cantidad inválida en ${codigo}.`);
  return { productId, codigo, nombre, talla, cantidad, precio: Number(precio.toFixed(2)) };
}

function isC807Delivery(value) {
  return text(value, 60).toLowerCase().includes('c807');
}

function isPedidoExpress(value) {
  return text(value, 60).toLowerCase().includes('pedido express');
}

function calculateC807Commission(amount) {
  const total = number(amount, 0);
  if (total <= 0) return 0;
  if (total <= 25) return 1;
  return Number((total * 0.04).toFixed(2));
}

function normalizeSale(input = {}, id = null, previous = null) {
  const fecha = validDate(input.fecha);
  if (!fecha) throw new Error('Selecciona una fecha para la venta.');
  const items = Array.isArray(input.items) ? input.items.map(normalizeItem) : [];
  if (!items.length) throw new Error('Agrega al menos una prenda a la venta.');
  const estado = SALE_STATES.has(input.estado) ? input.estado : 'Pendiente';
  const dinero = MONEY_STATES.has(input.dinero) ? input.dinero : 'Pendiente';
  const envio = number(input.envio, 0);
  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const total = Number((subtotal + envio).toFixed(2));
  const entrega = text(input.entrega || 'Pedido Express', 60);
  const usesC807 = isC807Delivery(entrega);
  const previousCommission = number(previous?.comisionC807, 0);
  let comisionC807 = 0;
  if (usesC807 && dinero === 'Pendiente') {
    comisionC807 = calculateC807Commission(total);
  } else if (usesC807 && dinero === 'En caja' && previousCommission > 0) {
    comisionC807 = previousCommission;
  }
  return {
    id: id || randomUUID(),
    fecha,
    canal: text(input.canal || 'Instagram', 40),
    fechaExpress: validDate(input.fechaExpress) || '',
    fechaRetiro: validDate(input.fechaRetiro) || '',
    cliente: text(input.cliente, 140),
    lugarHorario: text(input.lugarHorario, 300),
    destinoDriveId: text(input.destinoDriveId ?? previous?.destinoDriveId, 120),
    destinoImagen: text(input.destinoImagen ?? previous?.destinoImagen, 500),
    items,
    envio: Number(envio.toFixed(2)),
    subtotal: Number(subtotal.toFixed(2)),
    total,
    entrega,
    costoGuiaC807: usesC807 ? C807_GUIDE_COST : 0,
    comisionC807: Number(comisionC807.toFixed(2)),
    estado,
    etapaEnvio: ['Pedido tomado', 'Empacado', 'Enviado'].includes(input.etapaEnvio) ? input.etapaEnvio : (previous?.etapaEnvio || 'Pedido tomado'),
    dinero,
    cobroSolicitadoAt: validTimestamp(input.cobroSolicitadoAt) || validTimestamp(previous?.cobroSolicitadoAt),
    cobroCanceladoAt: validTimestamp(input.cobroCanceladoAt) || validTimestamp(previous?.cobroCanceladoAt),
    notas: text(input.notas, 600),
  };
}

function normalizeExpense(input = {}, id = null, previous = null) {
  const fecha = validDate(input.fecha || previous?.fecha);
  if (!fecha) throw new Error('Selecciona una fecha para el gasto.');
  const monto = number(input.monto ?? previous?.monto, 0);
  if (monto <= 0) throw new Error('El gasto debe ser mayor que $0.');
  return {
    id: id || previous?.id || randomUUID(),
    fecha,
    categoria: text(input.categoria || previous?.categoria || 'Otros', 80),
    descripcion: text(input.descripcion || previous?.descripcion, 260),
    monto: Number(monto.toFixed(2)),
    metodo: text(input.metodo || previous?.metodo || '', 80),
    notas: text(input.notas || previous?.notas, 400),
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function reservesStock(sale) {
  return !['Cancelado', 'No retirado'].includes(sale?.estado);
}

function impact(sale) {
  const result = new Map();
  if (!sale || !reservesStock(sale)) return result;
  for (const item of sale.items || []) {
    const key = `${item.productId}:${item.talla}`;
    result.set(key, (result.get(key) || 0) + int(item.cantidad, 0));
  }
  return result;
}

function adjustmentFrom(oldSale, newSale) {
  const oldImpact = impact(oldSale);
  const newImpact = impact(newSale);
  const keys = new Set([...oldImpact.keys(), ...newImpact.keys()]);
  const delta = new Map();
  for (const key of keys) delta.set(key, (oldImpact.get(key) || 0) - (newImpact.get(key) || 0));
  return delta;
}

async function mutateJSON(key, fallback, mutator) {
  const blobs = store();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const entry = await blobs.getWithMetadata(key, { type: 'json', consistency: 'strong' });
    const current = entry?.data ?? clone(fallback);
    const next = await mutator(clone(current));
    const result = await blobs.setJSON(key, next, entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true });
    if (result.modified) return next;
  }
  throw new Error('Los datos cambiaron al mismo tiempo. Intenta de nuevo.');
}

async function getInventory() {
  return (await store().get(INVENTORY_KEY, { type: 'json', consistency: 'strong' })) || {};
}

async function applyInventoryDelta(delta, allowNegative = false) {
  if (![...delta.values()].some(value => value !== 0)) return getInventory();
  return mutateJSON(INVENTORY_KEY, {}, inventory => {
    for (const [key, change] of delta.entries()) {
      if (!change) continue;
      const [productId, size] = key.split(':');
      const current = normalizeStock(inventory[productId]);
      const next = current[size] + change;
      if (!allowNegative && next < 0) {
        throw new Error(`Stock insuficiente para la talla ${size}. Quedan ${current[size]} unidades.`);
      }
      current[size] = Math.max(0, next);
      inventory[productId] = current;
    }
    return inventory;
  });
}

async function setInventory(productId, stock) {
  const key = String(Number(productId));
  if (!/^\d+$/.test(key) || Number(key) <= 0) throw new Error('Producto inválido.');
  const normalized = normalizeStock(stock);
  return mutateJSON(INVENTORY_KEY, {}, inventory => {
    inventory[key] = normalized;
    return inventory;
  });
}

async function getWeek(start) {
  const value = await store().get(weekKey(start), { type: 'json', consistency: 'strong' });
  return Array.isArray(value) ? value : [];
}

async function mutateWeek(start, mutator) {
  return mutateJSON(weekKey(start), [], sales => {
    const list = Array.isArray(sales) ? sales : [];
    return mutator(list);
  });
}

async function getExpenses(start) {
  const value = await store().get(expenseKey(start), { type: 'json', consistency: 'strong' });
  return Array.isArray(value) ? value : [];
}

async function mutateExpenses(start, mutator) {
  return mutateJSON(expenseKey(start), [], expenses => mutator(Array.isArray(expenses) ? expenses : []));
}

async function getReceivables(anchorDate, weeks = 26) {
  const currentStart = weekStartFor(anchorDate);
  const count = Math.min(52, Math.max(1, int(weeks, 1)));
  const all = [];
  for (let i = 0; i < count; i += 1) {
    const start = addDays(currentStart, i * -7);
    const sales = await getWeek(start);
    for (const sale of sales) {
      if (sale?.dinero !== 'Pendiente') continue;
      if (!reservesStock(sale)) continue;
      if (!isPedidoExpress(sale?.entrega)) continue;
      all.push({ ...sale, weekStart: start });
    }
  }
  return all.sort((a, b) => String(b.fechaRetiro || b.fecha).localeCompare(String(a.fechaRetiro || a.fecha)));
}

function findSale(sales, id) {
  return sales.find(sale => sale?.id === id) || null;
}

async function exportSnapshot() {
  const blobs = store();
  const [weekEntries, expenseEntries, inventory] = await Promise.all([
    blobs.list({ prefix: 'week/' }),
    blobs.list({ prefix: 'expenses/' }),
    getInventory(),
  ]);

  const weeks = await Promise.all(
    (weekEntries.blobs || []).map(async entry => ({
      key: entry.key,
      weekStart: entry.key.replace(/^week\//, ''),
      sales: (await blobs.get(entry.key, { type: 'json', consistency: 'strong' })) || [],
    }))
  );

  const expenses = await Promise.all(
    (expenseEntries.blobs || []).map(async entry => ({
      key: entry.key,
      weekStart: entry.key.replace(/^expenses\//, ''),
      expenses: (await blobs.get(entry.key, { type: 'json', consistency: 'strong' })) || [],
    }))
  );

  return { inventory, weeks, expenses };
}


const SUPABASE_EDGE = 'https://uysfqzlihiosebqzvfrl.supabase.co/functions/v1/haki-operations';
const MIGRATION_FLAG_KEY = 'supabase-migration-v1';
let supabaseReadyMemory = false;

function operationsToken() {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (!secret) throw new Error('Falta ADMIN_SESSION_SECRET.');
  return makeOperationsToken(secret);
}

async function edgeRequest(query = '', options = {}) {
  const response = await fetch(`${SUPABASE_EDGE}${query ? `?${query}` : ''}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-haki-operations-token': operationsToken(),
      ...(options.headers || {}),
    },
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw || `Error ${response.status}` }; }
  if (!response.ok) {
    const error = new Error(data?.error || `Supabase respondió ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function migrationProducts() {
  const { owner, repo } = repoParts();
  const path = `/repos/${owner}/${repo}/contents/productos.js?ref=${encodeURIComponent(BRANCH)}`;
  const file = await github(path, { method: 'GET' });
  const source = Buffer.from(file.content, 'base64').toString('utf8');
  const match = source.match(/window\.HAKI_PRODUCTOS\s*=\s*(\[[\s\S]*\]);\s*$/);
  if (!match) throw new Error('No se pudo leer productos.js para migrar inventario.');
  const products = JSON.parse(match[1]);
  return Array.isArray(products) ? products : [];
}

async function markSupabaseReady(details = {}) {
  supabaseReadyMemory = true;
  await store().setJSON(MIGRATION_FLAG_KEY, {
    completed: true,
    completedAt: new Date().toISOString(),
    ...details,
  });
}

async function ensureSupabaseReady() {
  if (supabaseReadyMemory) return true;

  const flag = await store().get(MIGRATION_FLAG_KEY, { type: 'json', consistency: 'strong' });
  if (flag?.completed) {
    supabaseReadyMemory = true;
    return true;
  }

  try {
    const status = await edgeRequest('mode=status', { method: 'GET' });
    if (status?.migrated) {
      await markSupabaseReady({ recoveredFromSupabase: true, migration: status.migration || null });
      return true;
    }

    const [snapshot, products] = await Promise.all([
      exportSnapshot(),
      migrationProducts(),
    ]);

    const imported = await edgeRequest('mode=import', {
      method: 'POST',
      body: JSON.stringify({ snapshot, products }),
    });

    const verify = await edgeRequest('mode=status', { method: 'GET' });
    if (!verify?.migrated) throw new Error('Supabase no confirmó la migración.');

    await markSupabaseReady({
      salesCount: imported?.salesCount ?? verify?.migration?.salesCount ?? null,
      expensesCount: imported?.expensesCount ?? verify?.migration?.expensesCount ?? null,
      inventoryRows: imported?.inventoryRows ?? verify?.migration?.inventoryRows ?? null,
    });
    return true;
  } catch (error) {
    console.error('Migración Supabase aplazada:', error);
    return false;
  }
}

async function proxySalesToSupabase(request, url) {
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.clone().text();
  const response = await fetch(`${SUPABASE_EDGE}${url.search}`, {
    method: request.method,
    headers: {
      'content-type': 'application/json',
      'x-haki-operations-token': operationsToken(),
    },
    body,
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw || `Error ${response.status}` }; }
  return json(data, response.status);
}

export default async (request) => {
  if (!verifyAdmin(request)) return json({ error: 'No autorizado.' }, 401);

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'week';

  try {
    if (mode !== 'export') {
      const ready = await ensureSupabaseReady();
      if (ready) return await proxySalesToSupabase(request, url);
    }

    if (request.method === 'GET' && mode === 'export') {
      return json(await exportSnapshot());
    }

    if (request.method === 'GET' && mode === 'inventory') {
      return json({ inventory: await getInventory() });
    }

    if (request.method === 'PUT' && mode === 'inventory') {
      const body = await bodyJson(request);
      const inventory = await setInventory(body?.productId, body?.stock);
      return json({ ok: true, inventory });
    }

    if (request.method === 'GET' && mode === 'expenses') {
      const requested = url.searchParams.get('weekStart') || weekStartFor(new Date().toISOString().slice(0, 10));
      const start = weekStartFor(requested);
      return json({ weekStart: start, expenses: await getExpenses(start) });
    }

    if (request.method === 'POST' && mode === 'expenses') {
      const body = await bodyJson(request);
      const expense = normalizeExpense(body?.expense || body);
      const start = weekStartFor(expense.fecha);
      await mutateExpenses(start, list => {
        list.push(expense);
        return list;
      });
      return json({ ok: true, expense, weekStart: start }, 201);
    }

    if (request.method === 'PUT' && mode === 'expenses') {
      const body = await bodyJson(request);
      const input = body?.expense || body;
      const id = text(input?.id, 80);
      const previousStart = weekStartFor(body?.previousWeekStart || input?.fecha);
      const previousList = await getExpenses(previousStart);
      const previous = previousList.find(item => item?.id === id);
      if (!previous) throw new Error('No se encontró el gasto.');
      const expense = normalizeExpense(input, id, previous);
      const nextStart = weekStartFor(expense.fecha);
      if (nextStart === previousStart) {
        await mutateExpenses(previousStart, list => list.map(item => item.id === id ? expense : item));
      } else {
        await mutateExpenses(previousStart, list => list.filter(item => item.id !== id));
        await mutateExpenses(nextStart, list => { list.push(expense); return list; });
      }
      return json({ ok: true, expense, weekStart: nextStart });
    }

    if (request.method === 'DELETE' && mode === 'expenses') {
      const body = await bodyJson(request);
      const id = text(body?.id, 80);
      const start = weekStartFor(body?.weekStart);
      if (!id) throw new Error('Falta el identificador del gasto.');
      await mutateExpenses(start, list => list.filter(item => item.id !== id));
      return json({ ok: true });
    }

    if (request.method === 'GET' && mode === 'receivables') {
      const anchor = validDate(url.searchParams.get('anchor')) || new Date().toISOString().slice(0, 10);
      const weeks = Number(url.searchParams.get('weeks') || 26);
      return json({ receivables: await getReceivables(anchor, weeks) });
    }

    if (request.method === 'GET') {
      const requested = url.searchParams.get('weekStart') || weekStartFor(new Date().toISOString().slice(0, 10));
      const start = weekStartFor(requested);
      const [sales, inventory] = await Promise.all([getWeek(start), getInventory()]);
      return json({ weekStart: start, weekEnd: addDays(start, 6), sales, inventory });
    }

    if (request.method === 'POST') {
      const body = await bodyJson(request);
      const sale = normalizeSale(body?.sale || body);
      sale.createdAt = new Date().toISOString();
      sale.updatedAt = sale.createdAt;
      const start = weekStartFor(sale.fecha);
      const delta = adjustmentFrom(null, sale);
      await applyInventoryDelta(delta);
      try {
        await mutateWeek(start, sales => {
          sales.push(sale);
          return sales;
        });
      } catch (error) {
        await applyInventoryDelta(new Map([...delta].map(([key, value]) => [key, -value])), true).catch(() => {});
        throw error;
      }
      return json({ ok: true, sale, weekStart: start }, 201);
    }

    if (request.method === 'PUT' || request.method === 'PATCH') {
      const body = await bodyJson(request);
      const partial = request.method === 'PATCH';
      let saleInput = body?.sale || body;
      if (partial && !['estado', 'etapaEnvio'].includes(body.field)) throw new Error('Campo no permitido.');
      if (partial && body.field === 'estado' && !SALE_STATES.has(body.value)) throw new Error('Estado inválido.');
      if (partial && body.field === 'etapaEnvio' && !['Pedido tomado', 'Empacado', 'Enviado'].includes(body.value)) throw new Error('Etapa inválida.');
      const id = text(saleInput?.id, 80);
      if (!id) throw new Error('Falta el identificador de la venta.');
      const previousStart = weekStartFor(body?.previousWeekStart || (partial ? body.weekStart : saleInput?.fecha));
      const previousSales = await getWeek(previousStart);
      const previous = findSale(previousSales, id);
      if (!previous) throw new Error('No se encontró la venta que intentas editar.');
      if (partial) {
        if ((body.updatedAt || '') !== (previous.updatedAt || '')) throw new Error('Esta venta cambió. Actualiza la semana antes de editarla.');
        saleInput = { ...previous, [body.field]: body.value };
      }
      const sale = partial ? { ...previous, [body.field]: body.value } : { ...previous, ...normalizeSale(saleInput, id, previous) };
      sale.createdAt = previous.createdAt || new Date().toISOString();
      sale.updatedAt = new Date().toISOString();
      const nextStart = weekStartFor(sale.fecha);
      const delta = adjustmentFrom(previous, sale);
      await applyInventoryDelta(delta);

      try {
        if (nextStart === previousStart) {
          await mutateWeek(previousStart, sales => {
            const latest = findSale(sales, id);
            if (partial && (!latest || (latest.updatedAt || '') !== (previous.updatedAt || ''))) throw new Error('La venta cambió. Actualiza la semana.');
            return sales.map(entry => entry.id === id ? sale : entry);
          });
        } else {
          await mutateWeek(previousStart, sales => sales.filter(entry => entry.id !== id));
          try {
            await mutateWeek(nextStart, sales => {
              sales.push(sale);
              return sales;
            });
          } catch (error) {
            await mutateWeek(previousStart, sales => {
              if (!findSale(sales, id)) sales.push(previous);
              return sales;
            }).catch(() => {});
            throw error;
          }
        }
      } catch (error) {
        await applyInventoryDelta(new Map([...delta].map(([key, value]) => [key, -value])), true).catch(() => {});
        throw error;
      }
      return json({ ok: true, sale, weekStart: nextStart, ...(partial ? { inventory: await getInventory() } : {}) });
    }

    if (request.method === 'DELETE') {
      const body = await bodyJson(request);
      const id = text(body?.id, 80);
      const start = weekStartFor(body?.weekStart);
      if (!id) throw new Error('Falta el identificador de la venta.');
      const sales = await getWeek(start);
      const previous = findSale(sales, id);
      if (!previous) throw new Error('No se encontró la venta.');
      const delta = adjustmentFrom(previous, null);
      await applyInventoryDelta(delta, true);
      try {
        await mutateWeek(start, entries => entries.filter(entry => entry.id !== id));
      } catch (error) {
        await applyInventoryDelta(new Map([...delta].map(([key, value]) => [key, -value])), true).catch(() => {});
        throw error;
      }
      return json({ ok: true });
    }

    return json({ error: 'Método no permitido.' }, 405);
  } catch (error) {
    console.error(error);
    return json({ error: error.message || 'Error del servidor.' }, 400);
  }
};
