import { getStore } from '@netlify/blobs';

export const SIZES = ['S', 'M', 'L', 'XL'];
const SUPABASE_AVAILABILITY = 'https://uysfqzlihiosebqzvfrl.supabase.co/functions/v1/haki-operations?mode=availability';

export async function readInventory() {
  try {
    const response = await fetch(SUPABASE_AVAILABILITY, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (response.ok) {
      const data = await response.json();
      if (data?.migrated && data?.inventory && typeof data.inventory === 'object') {
        return data.inventory;
      }
    }
  } catch {}

  return (await getStore({ name: 'haki-private-sales', consistency: 'strong' }).get('inventory', { type: 'json', consistency: 'strong' })) || {};
}

export function applyAvailability(products, inventory) {
  return products.map(product => {
    const stock = inventory[String(product.codigo || '').toUpperCase()] || inventory[String(product.id)];
    if (!stock) return product;
    const tallas = { ...product.tallas };
    for (const size of SIZES) {
      if (Object.hasOwn(stock, size)) tallas[size] = Number(stock[size]) > 0;
    }
    return { ...product, tallas };
  });
}
