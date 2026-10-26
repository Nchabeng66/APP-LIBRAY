// Single place for every fetch call so the backend URL is easy to change.
const API_BASE = '/api';
const SESSION_KEY = 'library_member_session';

function getSessionRole() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return typeof session?.role === 'string' && session.role ? session.role : null;
  } catch {
    return null;
  }
}

export async function requestJson(path, options = {}) {
  const config = {
    headers: { ...(options.headers || {}) },
    ...options,
  };

  if (!config.headers['x-user-role']) {
    const sessionRole = getSessionRole();
    if (sessionRole) {
      config.headers['x-user-role'] = sessionRole;
    }
  }

  if (options.body && !(options.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, config);

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      message = data.error || data.message || message;
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function uploadFile(path, file) {
  const form = new FormData();
  form.append('file', file);
  return requestJson(path, { method: 'POST', body: form });
}