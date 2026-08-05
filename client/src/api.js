const getToken = () => localStorage.getItem('smt-school-token');

const req = (method, path, body, params) => {
  let url = path;
  if (params) {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
      )
    ).toString();
    if (qs) url += '?' + qs;
  }
  const token = getToken();
  return fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) {
      // A dead/expired token must not be treated like "no data" — every
      // component that catches a failed request differently (empty list,
      // silent no-op, etc.) would otherwise show its own misleading story
      // instead of the real one: your session ended, log in again. One
      // global signal here, one global handler in App.jsx, instead of each
      // call site having to guess.
      //
      // Only fire it when a real token was actually sent and still got
      // rejected. A request that went out with no token yet (a startup
      // race — some effect reading localStorage before a just-completed
      // login has written to it) isn't a session expiring; treating it as
      // one force-logs-out a user who just successfully logged in.
      if (r.status === 401 && token) {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      throw new Error(data.message || 'Request failed');
    }
    return data;
  });
};

export const api = {
  get: (path, params) => req('GET', path, null, params),
  post: (path, body) => req('POST', path, body),
  put: (path, body) => req('PUT', path, body),
  delete: (path, body) => req('DELETE', path, body),
};
