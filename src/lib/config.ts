/**
 * Global config — membaca Vite env
 *
 *  • VITE_API_URL → production (contoh: https://api.hms.nexa.net.id)
 *  • fallback dev → http://localhost:3001
 *  • fallback prod tanpa env → /api   (akan diproxy Nginx)
 */



const envBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '/api');

export const API_CONFIG = {
  baseURL: envBase.replace(/\/$/, ''), // hilangkan trailing slash
  timeout: 10_000,
  retries: 3,
};

export const APP_CONFIG = {
  name: 'Helpdesk Management System',
  version: '1.0.0',
  description: 'Comprehensive Ticket Management & Analytics Platform',
};

/* ---------- helper util ---------- */
export const getAuthToken  = () => localStorage.getItem('auth_token');
export const getUser       = () => JSON.parse(localStorage.getItem('user') || 'null');
export const getSessionId  = () => localStorage.getItem('session_id');

/* ---------- fetch wrapper ---------- */
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const url   = `${API_CONFIG.baseURL}${endpoint}`;

  const cfg: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    signal: AbortSignal.timeout(API_CONFIG.timeout),
  };

  const res = await fetch(url, cfg);

  if (res.status === 401) {
    // DISABLED: Authentication redirect - Login page is disabled
    // localStorage.clear();
    // window.location.href = '/login';
    // throw new Error('Unauthenticated');
    console.warn('Authentication required but login is disabled');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

  return data;
};
