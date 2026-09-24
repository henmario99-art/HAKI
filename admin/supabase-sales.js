(() => {
  const EDGE = 'https://uysfqzlihiosebqzvfrl.supabase.co/functions/v1/haki-operations';
  let operationsToken = '';
  let sessionPromise;
  let readyPromise;
  let transport = 'direct';

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

  function proxyRequest(query, options) {
    return requestJSON(`/.netlify/functions/sales${query ? `?${query}` : ''}`, {
      ...options, credentials: 'same-origin',
      headers: { ...(options.headers || {}), 'content-type': 'application/json' },
    });
  }

  async function ready() {
    const auth = await session();
    if (!auth.authenticated || !operationsToken) {
      sessionPromise = null;
      throw new Error('La sesión terminó. Entra de nuevo al administrador.');
    }
    return true;
  }

  window.hakiOperationalSession = session;
  window.hakiSupabaseSalesApi = async (path, options = {}) => {
    const query = String(path || '').replace(/^sales\\??/, '');
    const method = String(options.method || 'GET').toUpperCase();
    const readOnly = method === 'GET' || method === 'HEAD';

    try {
      await ready();
      return await (transport === 'proxy' ? proxyRequest(query, options) : edgeRequest(query, options));
    } catch (error) {
      if (error.status === 401) {
        // Un 401 rechaza la solicitud antes de mutar datos; renovar y repetir es seguro.
        operationsToken = '';
        sessionPromise = null;
        readyPromise = null;
        transport = 'direct';
        await ready();
        return transport === 'proxy' ? proxyRequest(query, options) : edgeRequest(query, options);
      }

      // Si una lectura directa falla por red/CORS, usar Netlify como respaldo.
      // Nunca repetimos automáticamente una escritura incierta.
      if (transport === 'direct' && readOnly) {
        const data = await proxyRequest(query, options);
        transport = 'proxy';
        return data;
      }
      throw error;
    }
  };
})();
