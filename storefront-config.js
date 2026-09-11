// Defaults are shared by the storefront and its existing administrator.
window.HAKI_COLLECTION_DEFAULTS = [
  { id: 'collection-1', nombre: 'Camisetas y tops', imagen: '', categoria: 'Camisetas' },
  { id: 'collection-2', nombre: 'Shorts', imagen: '', categoria: 'Shorts' },
  { id: 'collection-3', nombre: 'Joggers y pants', imagen: '', categoria: 'Pants' },
  { id: 'collection-4', nombre: 'Hoodies y sudaderas', imagen: '', categoria: 'Hoodies' }
];
window.hakiCollections = config => window.HAKI_COLLECTION_DEFAULTS.map((item, index) => ({
  ...item, ...(Array.isArray(config.colecciones) ? config.colecciones[index] : {}), id: item.id
}));
