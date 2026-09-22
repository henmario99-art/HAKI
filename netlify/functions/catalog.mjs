import { json, bodyJson, verifyAdmin, makeOperationsToken } from './_shared.mjs';

const EDGE = 'https://uysfqzlihiosebqzvfrl.supabase.co/functions/v1/haki-operations';

function validatePayload(body) {
  if (!body || typeof body !== 'object') throw new Error('Datos inválidos.');
  if (!body.config || typeof body.config !== 'object') throw new Error('Falta la configuración.');
  if (!Array.isArray(body.products)) throw new Error('Falta la lista de productos.');
  const seen = new Set();
  for (const [index, p] of body.products.entries()) {
    if (!p || typeof p !== 'object') throw new Error(`Producto ${index + 1} inválido.`);
    p.id = Number(p.id || index + 1);
    p.codigo = String(p.codigo || '').trim().toUpperCase();
    p.nombre = String(p.nombre || '').trim();
    p.categoria = String(p.categoria || '').trim();
    p.precio = Number(p.precio || 0);
    p.imagen = String(p.imagen || '').trim();
    p.imagenRespaldo = String(p.imagenRespaldo || 'images/producto.svg').trim();
    p.masVendido = p.masVendido === true;
    p.etiquetaMasVendido = String(p.etiquetaMasVendido || 'MÁS VENDIDO').trim().slice(0, 40) || 'MÁS VENDIDO';
    p.tallas = { S: !!p.tallas?.S, M: !!p.tallas?.M, L: !!p.tallas?.L, XL: !!p.tallas?.XL };
    if (!p.codigo) throw new Error(`El producto ${index + 1} no tiene código.`);
    if (!p.nombre) throw new Error(`El producto ${index + 1} no tiene nombre.`);
    if (!Number.isFinite(p.precio) || p.precio < 0) throw new Error(`Precio inválido en ${p.codigo}.`);
    if (seen.has(p.codigo)) throw new Error(`Código duplicado: ${p.codigo}`);
    seen.add(p.codigo);
  }
}

function token() {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (!secret) throw new Error('El panel no tiene configurada la sesión administrativa.');
  return makeOperationsToken(secret);
}

async function edge(mode, options = {}) {
  const response = await fetch(`${EDGE}?mode=${encodeURIComponent(mode)}`, {
    ...options,
    headers: {
      'content-type':'application/json',
      'x-haki-operations-token':token(),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export default async request => {
  if (!verifyAdmin(request)) return json({ error:'No autorizado.' },401);
  try {
    if (request.method === 'GET') {
      const data = await edge('catalog', { method:'GET' });
      return json({ config:data.config || {}, products:data.products || [], sha:data.version || '', branch:'supabase', storage:'supabase' });
    }
    if (request.method === 'PATCH') {
      const body = await bodyJson(request);
      const partial = body?.config && typeof body.config === 'object' ? body.config : {};
      const current = await edge('catalog', { method:'GET' });
      const mergedConfig = { ...(current.config || {}), ...partial };
      const data = await edge('catalog', {
        method:'PUT',
        body:JSON.stringify({
          config:mergedConfig,
          products:Array.isArray(current.products) ? current.products : [],
          expectedVersion:String(current.version || ''),
        }),
      });
      return json({
        ok:true,
        config:data.config || mergedConfig,
        products:data.products || current.products || [],
        sha:data.version || '',
        commit:null,
        storage:'supabase',
      });
    }
    if (request.method === 'PUT') {
      const body = await bodyJson(request);
      validatePayload(body);
      const supplied = String(body.sha || '');
      const expectedVersion = /^[0-9a-f]{40}$/i.test(supplied) ? '' : supplied;
      const data = await edge('catalog', {
        method:'PUT',
        body:JSON.stringify({ config:body.config, products:body.products, expectedVersion }),
      });
      return json({ ok:true, config:data.config || body.config, products:data.products || body.products, sha:data.version || '', commit:null, storage:'supabase' });
    }
    return json({ error:'Método no permitido.' },405);
  } catch(error) {
    console.error(error);
    return json({ error:error.message || 'Error del servidor.' }, error.status || 500);
  }
};