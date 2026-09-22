import { getStore } from '@netlify/blobs';
export const SIZES = ['S', 'M', 'L', 'XL'];
export async function readInventory() {
  return (await getStore({ name: 'haki-private-sales', consistency: 'strong' }).get('inventory', { type: 'json', consistency: 'strong' })) || {};
}
export function applyAvailability(products, inventory) {
  return products.map(product => {
    const stock = inventory[String(product.id)];
    if (!stock) return product;
    const tallas = { ...product.tallas };
    for (const size of SIZES) {
      if (Object.hasOwn(stock, size)) tallas[size] = Number(stock[size]) > 0;
    }
    return { ...product, tallas };
  });
}
