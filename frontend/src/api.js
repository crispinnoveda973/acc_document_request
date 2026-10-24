import axios from 'axios';

const api = axios.create({ baseURL: '/api', headers: { Accept: 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('acc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !location.pathname.startsWith('/login')) {
      localStorage.removeItem('acc_token');
      location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e) => {
  const d = e.response?.data;
  if (d?.errors) return Object.values(d.errors).flat()[0];
  return d?.message || 'Something went wrong. Please try again.';
};
export const fieldErrors = (e) =>
  Object.fromEntries(Object.entries(e.response?.data?.errors || {}).map(([k, v]) => [k, v[0]]));

export const READY = 'Ready to pick up';
export const STATUSES = ['Pending', 'Under Review', 'Approved', 'Processing', READY, 'Completed', 'Rejected', 'Cancelled'];
export const FINAL = ['Completed', 'Rejected', 'Cancelled'];
export const PAYMENT_METHODS = ['GCash', 'Bank Transfer', 'Cash'];
/** Paid online by the student and checked by the admin. Cash is paid at the office and recorded by the admin. */
export const ONLINE_METHODS = ['GCash', 'Bank Transfer'];
export const PAYMENT_STATUSES = ['Unpaid', 'Pending Verification', 'Verified', 'Rejected'];
/** A paid document can only be released (ready / completed) once its payment is verified (also enforced by the API). */
export const NEEDS_VERIFIED_PAYMENT = [READY, 'Completed'];

/**
 * Payment reference numbers. These rules mirror DocumentRequest::referenceRules() in the backend
 * so students get instant feedback; the API remains the final authority.
 */
export const normalizeRef = (v = '') => v.replace(/[\s-]+/g, '').toUpperCase();
export const REF_RULES = {
  GCash: { re: /^[0-9]{10,20}$/, hint: '10–20 digits — the "Ref. No." on your GCash receipt' },
  'Bank Transfer': { re: /^[A-Z0-9]{6,40}$/, hint: '6–40 letters/numbers — from your bank transfer or deposit slip' },
};
export const refError = (method, value) => {
  const v = normalizeRef(value);
  return v && REF_RULES[method] && !REF_RULES[method].re.test(v) ? `Invalid ${method} reference number. Use ${REF_RULES[method].hint}.` : null;
};

/** Profile picture limits (mirror AuthController::updatePhoto). */
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AVATAR_MAX_MB = 2;

/**
 * XSS defence in depth: only ever put a URL into href / src when it points at this site's own uploads (/storage/...)
 * or is a plain http(s) link. Anything else (javascript:, data:, vbscript: ...) becomes "#".
 */
export const safeUrl = (u) => (typeof u === 'string' && (/^\/storage\/[\w\-./() ]+$/.test(u) || /^https?:\/\//i.test(u)) ? u : '#');

export const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmt = (d) => (d ? new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const fmtDate = (d) => (d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '—');
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default api;
