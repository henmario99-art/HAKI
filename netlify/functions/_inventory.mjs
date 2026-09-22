import { readJSON } from './_private-store.mjs';

export const SIZES = ['S', 'M', 'L', 'XL'];

export async function readInventory() {
  return await readJSON('inventory', {});
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

export function filterPublicStock(products, inventory) {
  return products.filter(product => {
    const stock = inventory[String(product.id)];
    if (!stock || typeof stock !== 'object') return true;
    const tracked = SIZES.some(size => Object.hasOwn(stock, size));
    if (!tracked) return true;
    return SIZES.some(size => Number(stock[size]) > 0);
  });
}
