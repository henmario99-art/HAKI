(() => {
  const EDGE = 'https://uysfqzlihiosebqzvfrl.supabase.co/functions/v1/haki-operations';
  let operationsToken = '';

  function setToken(token) {
    operationsToken = String(token || '');
  }

  async function edgeRequest(query = '', options = {}) {
    if (!operationsToken) throw new Error('Falta la sesión operativa de HAKI.');
    const response = await fetch(`${EDGE}${query ? `?${query}` : ''}`, {
      ...options,
      headers: {
        'content-type': 'application/json',
        'x-haki-operations-token': operationsToken,
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
    return data;
  }

  async function migrateIfNeeded(products = []) {
    if (!operationsToken) return false;
    try {
      const status = await edgeRequest('mode=status', { method: 'GET' });
      if (status.migrated) return true;

      const exportResponse = await fetch('/.netlify/functions/sales?mode=export', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      });
      const snapshot = await exportResponse.json().catch(() => ({}));
      if (!exportResponse.ok) throw new Error(snapshot.error || 'No se pudo exportar el almacenamiento anterior.');

      await edgeRequest('mode=import', {
        method: 'POST',
        body: JSON.stringify({ snapshot, products }),
      });

      const verify = await edgeRequest('mode=status', { method: 'GET' });
      return !!verify.migrated;
    } catch (error) {
      console.error('HAKI Supabase migration:', error);
      return false;
    }
  }

  async function salesApi(path, options = {}) {
    const query = String(path || '').replace(/^sales\??/, '');
    return edgeRequest(query, options);
  }

  window.hakiSetOperationsToken = setToken;
  window.hakiEnsureOperationalStore = migrateIfNeeded;
  window.hakiSupabaseSalesApi = salesApi;
})();