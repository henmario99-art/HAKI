import { json } from './_shared.mjs';

// Checks ONE "Código de descuento" for the cart. The list of codes never
// reaches the store: the server answers only for the code typed.
const EDGE = 'https://uysfqzlihiosebqzvfrl.supabase.co/functions/v1/haki-admin-v2?mode=discount-code';

export default async request => {
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  const body = await request.json().catch(() => ({}));
  const code = String(body?.code ?? '').normalize('NFKC').replace(/\s+/g, '').toUpperCase().slice(0, 30);
  if (!/^[A-Z0-9_-]{2,30}$/.test(code)) return json({ valid: false });
  try {
    const response = await fetch(EDGE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return json({ error: 'No se pudo revisar el código.' }, 503);
    const percent = Number(data?.percent);
    return data?.valid === true && Number.isInteger(percent) && percent >= 1 && percent <= 90
      ? json({ valid: true, code, percent })
      : json({ valid: false });
  } catch (error) {
    console.error(error);
    return json({ error: 'No se pudo revisar el código.' }, 503);
  }
};
