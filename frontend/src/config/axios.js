import axios from 'axios';

// Resolve base API URL from environment (supports .env.local)
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

// Create axios instance with built-in XSRF support
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Lightweight client to fetch CSRF without triggering interceptors
const csrfClient = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
});

// Read CSRF token from cookie if present
function readCsrfFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith('XSRF-TOKEN='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

async function ensureCsrfToken() {
  // Prefer cookie if available (works for same-site or when cookie is exposed)
  const fromCookie = readCsrfFromCookie();
  if (fromCookie) {
    api.defaults.headers.common['X-XSRF-TOKEN'] = fromCookie;
    return fromCookie;
  }

  // Fallback: call /api/csrf-token to obtain token via header/body
  const resp = await csrfClient.get('/csrf-token');
  const token = resp.data?.csrfToken;
  if (token) {
    api.defaults.headers.common['X-XSRF-TOKEN'] = token;
  }
  return token;
}

// Intercept requests: for state-changing methods, ensure CSRF is present
api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase();
  const needsCsrf = ['post', 'put', 'patch', 'delete'].includes(method);
  const hasHeader = Boolean(config.headers?.['X-XSRF-TOKEN'] || config.headers?.['x-xsrf-token']);

  if (needsCsrf && !hasHeader) {
    const token = await ensureCsrfToken();
    if (token) {
      config.headers = { ...(config.headers || {}), 'X-XSRF-TOKEN': token };
    }
  }
  return config;
});

export default api;
