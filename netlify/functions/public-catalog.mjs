import { json } from './_shared.mjs';

const EDGE='https://uysfqzlihiosebqzvfrl.supabase.co/functions/v1/haki-operations?mode=public-catalog';

export default async request => {
  if (request.method !== 'GET') return json({ error:'Método no permitido.' },405);
  try {
    const response=await fetch(EDGE,{headers:{accept:'application/json'},cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) return json({ error:data.error || 'Catálogo no disponible.' },response.status);
    return json(
      { config:data.config || {}, products:data.products || [], version:data.version || '' },
      200,
      {
        'cache-control':'no-store, max-age=0',
        'netlify-cdn-cache-control':'public, durable, max-age=15, stale-while-revalidate=30',
        'x-haki-catalog-source':'supabase-live',
      }
    );
  } catch(error) {
    console.error(error);
    return json({ error:'No se pudo cargar el catálogo.' },503);
  }
};
