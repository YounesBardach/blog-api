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

export async function ensureCsrfToken(forceFresh = false) {
  // In tests, avoid network and ensure header presence to keep tests deterministic
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test') {
    const testToken = 'test-csrf-token';
    api.defaults.headers.common['X-XSRF-TOKEN'] = testToken;
    return testToken;
  }

  // If caller requests a fresh token, bypass cookie and hit the endpoint
  if (forceFresh) {
    const resp = await csrfClient.get('/csrf-token');
    const token = resp.data?.csrfToken;
    if (token) {
      api.defaults.headers.common['X-XSRF-TOKEN'] = token;
    }
    return token;
  }

  // Otherwise prefer cookie if available (works for same-site or when cookie is exposed)
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

// Intercept requests: always refresh CSRF header from the latest cookie for state-changing methods
api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase();
  const needsCsrf = ['post', 'put', 'patch', 'delete'].includes(method);

  if (needsCsrf) {
    // Always fetch a fresh token to avoid any mismatch
    const token = await ensureCsrfToken(true);
    if (token) {
      config.headers = { ...(config.headers || {}), 'X-XSRF-TOKEN': token };
    }
  }
  return config;
});

export default api;
