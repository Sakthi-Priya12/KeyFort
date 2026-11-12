const BASE = import.meta.env.VITE_API_URL || '';

/** Calls the KeyFort REST API. Cookies carry the session; the custom header is the CSRF guard. */
export async function api(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'KeyFort' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    const err = new Error('Cannot reach the KeyFort server. Check that it is running.');
    err.network = true;
    throw err;
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error((data && data.message) || `Request failed (${res.status})`);
    err.status = res.status;
    err.errors = (data && data.errors) || {};
    err.data = data;
    throw err;
  }
  return data;
}

export const fmtDate = (v) => (v ? new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-');
export const qs = (o) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v !== '' && v !== undefined && v !== null) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};
