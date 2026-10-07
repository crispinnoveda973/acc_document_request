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

export const READY = 'Ready for Pick-up';
export const STATUSES = ['Pending', 'Under Review', 'Approved', 'Processing', READY, 'Completed', 'Rejected', 'Cancelled'];
export const FINAL = ['Completed', 'Rejected', 'Cancelled'];
export const PAYMENT_METHODS = ['GCash', 'Bank Transfer'];

export const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmt = (d) => (d ? new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const fmtDate = (d) => (d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '—');
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default api;
