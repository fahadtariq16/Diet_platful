// Small fetch wrapper. The auth cookie is httpOnly, so the browser sends it for us.
const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      signal,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError(0, "Can't reach the server. Check that the API is running.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status}).`);
  return data;
}
