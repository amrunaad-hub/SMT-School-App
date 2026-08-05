const getToken = () => localStorage.getItem('smt-school-token');

// Set while an intentional, user-initiated logout is in flight (see
// App.jsx's handleLogout) so any 401 that arrives during it — e.g. the
// logout flow's own push-unsubscribe call, or some unrelated request that
// happened to be in-flight at the moment of clicking Logout — doesn't get
// misread as an unexpected session death and show "Your session ended" on
// the next visit to the login page. A logout the user asked for is not a
// surprise; only an involuntary one should carry that message.
let loggingOut = false;
export const markLoggingOut = () => { loggingOut = true; };
// Called on a fresh successful login — otherwise the flag set by the first
// logout of the session would stay true forever, silently swallowing any
// real session-expiry 401 for the rest of the app's lifetime.
export const clearLoggingOut = () => { loggingOut = false; };

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
      if (r.status === 401 && token && !loggingOut) {
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
