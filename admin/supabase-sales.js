(() => {
  const EDGE = 'https://uysfqzlihiosebqzvfrl.supabase.co/functions/v1/haki-operations';
  let operationsToken = '';
  let sessionPromise;
  let readyPromise;

  async function requestJSON(url, options = {}) {
    let response;
    try {
      response = await fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(25000) });
    } catch (cause) {
      const write = !['GET', 'HEAD'].includes(options.method || 'GET');
      throw new Error(write
        ? 'Se interrumpió la conexión. Actualiza la semana para comprobar si se guardó antes de repetir el cambio.'
        : 'No se pudo conectar. Tus datos se conservan; vuelve a intentarlo.');
    }
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || typeof data !== 'object') {
      const error = new Error(data?.error || `No se pudo completar la solicitud (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function session() {
    if (!sessionPromise) {
      sessionPromise = requestJSON('/.netlify/functions/auth', {
        method: 'GET', credentials: 'same-origin', cache: 'no-store'
      }).then(auth => {
        operationsToken = auth.authenticated ? String(auth.operationsToken || '') : '';
        return auth;
      }).catch(error => { sessionPromise = null; throw error; });
    }
    return sessionPromise;
  }

  async function edgeRequest(query, options) {
    return requestJSON(`${EDGE}${query ? `?${query}` : ''}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'content-type': 'application/json',
        'x-haki-operations-token': operationsToken,
      },
    });
  }

  async function ready() {
    const auth = await session();
    if (!auth.authenticated || !operationsToken) {
      sessionPromise = null;
      throw new Error('La sesión terminó. Entra de nuevo al administrador.');
    }
    if (!readyPromise) {
      // Never write to the old Blobs store when Supabase is unavailable.
      readyPromise = edgeRequest('mode=status', { method: 'GET' }).then(status => {
        if (!status.migrated) throw new Error('No se pudo confirmar la base de datos de ventas.');
      }).catch(error => { readyPromise = null; throw error; });
    }
    return readyPromise;
  }

  window.hakiOperationalSession = session;
  window.hakiSupabaseSalesApi = async (path, options = {}) => {
    const query = String(path || '').replace(/^sales\??/, '');
    try {
      await ready();
      return await edgeRequest(query, options);
    } catch (error) {
      if (error.status !== 401) throw error;
      // 401 rejects the request before any mutation; refreshing is safe here.
      // Network/timeout/5xx failures are never replayed automatically.
      operationsToken = '';
      sessionPromise = null;
      readyPromise = null;
      await ready();
      return edgeRequest(query, options);
    }
  };
})();
