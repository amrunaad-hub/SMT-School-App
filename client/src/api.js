const getToken = () => sessionStorage.getItem('smt-school-token');

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
  return fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || 'Request failed');
    return data;
  });
};

export const api = {
  get: (path, params) => req('GET', path, null, params),
  post: (path, body) => req('POST', path, body),
  put: (path, body) => req('PUT', path, body),
  delete: (path, body) => req('DELETE', path, body),
};
