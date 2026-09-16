(() => {
  if (typeof api !== 'function') return;

  const baseApi = api;
  api = async function(path, options = {}) {
    const data = await baseApi(path, options);

    if (typeof path === 'string' && path.startsWith('sales?mode=receivables') && Array.isArray(data?.receivables)) {
      data.receivables = data.receivables.filter(sale => {
        const delivery = String(sale?.entrega || '').toLowerCase();
        return sale?.estado === 'Retirado'
          && sale?.dinero === 'Pendiente'
          && delivery.includes('pedido express');
      });
    }

    return data;
  };
})();
