import { useEffect, useMemo, useState } from 'react';
import { safeUrl } from '../api';

/* ---------- icons ---------- */
const PATHS = {
  home: 'M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5',
  plus: 'M12 5v14M5 12h14',
  file: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h6',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'M6 6l12 12M18 6L6 18',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  tag: 'M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8zM7.5 7.5h.01',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01',
  steps: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  check: 'M20 6L9 17l-5-5',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  wallet: 'M3 7a2 2 0 012-2h13a1 1 0 011 1v2M3 7v11a2 2 0 002 2h14a1 1 0 001-1v-3M3 7h15a2 2 0 012 2v2h-4a2 2 0 100 4h4v-4',
  copy: 'M9 9h11v11H9zM5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  mail: 'M3 5h18v14H3zM3 7l9 6 9-6',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  pin: 'M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zM12 12a2 2 0 100-4 2 2 0 000 4z',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M17.9 17.9A10.9 10.9 0 0112 20C5 20 1 12 1 12a18.5 18.5 0 015.1-5.9M9.9 4.2A10.9 10.9 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.2 3.2M1 1l22 22M14.1 14.1a3 3 0 11-4.2-4.2',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  printer: 'M7 9V3h10v6M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2M7 14h10v7H7zM17 11h.01',
  chevL: 'M15 18l-6-6 6-6',
  chevR: 'M9 18l6-6-6-6',
  chat: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2zM8 9h8M8 13h5',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  refresh: 'M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16M3 21v-5h5',
  camera: 'M3 8a2 2 0 012-2h2l1.5-2h7L17 6h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM12 17a4 4 0 100-8 4 4 0 000 8z',
};
export const Icon = ({ name, size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={PATHS[name]} />
  </svg>
);

/* ---------- logo (the college seal lives at frontend/public/logo.png; replace that file to change it everywhere) ---------- */
export const Logo = ({ size = 40, className = '' }) => {
  const [ok, setOk] = useState(true);
  return ok ? (
    <img src="/logo.png" alt="Abuyog Community College" width={size} height={size} onError={() => setOk(false)}
      className={`shrink-0 rounded-full bg-white object-contain ${className}`} style={{ width: size, height: size }} />
  ) : (
    <span className={`grid shrink-0 place-items-center rounded-full bg-white font-extrabold text-brand-800 ring-2 ring-gold-400 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.3 }}>ACC</span>
  );
};

/**
 * Round profile picture. Falls back to the user's initial when there is no photo
 * (or the file cannot be loaded). `user` is any object with `name` and `avatar_url`.
 */
export const Avatar = ({ user, size = 40, className = '' }) => {
  const [broken, setBroken] = useState(false);
  const url = user?.avatar_url;
  useEffect(() => setBroken(false), [url]);   // a new photo gets a fresh chance to load
  const name = user?.name || '?';
  const box = { width: size, height: size };

  return url && !broken ? (
    <img src={safeUrl(url)} alt={name} onError={() => setBroken(true)} style={box}
      className={`shrink-0 rounded-full bg-slate-200 object-cover ${className}`} />
  ) : (
    <span style={{ ...box, fontSize: size * 0.42 }} aria-label={name}
      className={`grid shrink-0 place-items-center rounded-full bg-gold-500 font-bold uppercase text-brand-900 ${className}`}>
      {name[0]}
    </span>
  );
};

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
    {label}
  </div>
);

/* ---------- badges ---------- */
const COLORS = {
  Pending: 'bg-amber-100 text-amber-800',
  'Under Review': 'bg-sky-100 text-sky-800',
  Approved: 'bg-emerald-100 text-emerald-800',
  Processing: 'bg-indigo-100 text-indigo-800',
  'Ready to pick up': 'bg-teal-100 text-teal-800',
  Completed: 'bg-green-200 text-green-900',
  Rejected: 'bg-red-100 text-red-800',
  Cancelled: 'bg-slate-200 text-slate-700',
  Unpaid: 'bg-slate-200 text-slate-700',
  'Pending Verification': 'bg-amber-100 text-amber-800',
  Verified: 'bg-green-200 text-green-900',
};
export const StatusBadge = ({ status }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORS[status] || 'bg-slate-100'}`}>{status}</span>
);

/* ---------- layout bits ---------- */
export const Card = ({ title, subtitle, children, className = '', actions, flush }) => (
  <section className={`rounded-xl bg-white ring-1 ring-slate-200 ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
    )}
    <div className={flush ? '' : 'p-5'}>{children}</div>
  </section>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {actions}
  </div>
);

export const StatCard = ({ label, value, icon, tone = 'brand', to, hint }) => {
  const tones = {
    brand: 'bg-brand-100 text-brand-700', amber: 'bg-amber-100 text-amber-700', sky: 'bg-sky-100 text-sky-700',
    teal: 'bg-teal-100 text-teal-700', red: 'bg-red-100 text-red-700', slate: 'bg-slate-200 text-slate-700',
  };
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white p-4 ring-1 ring-slate-200 transition hover:ring-brand-600/40 sm:p-5">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${tones[tone]}`}><Icon name={icon} size={22} /></span>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-none text-slate-900">{value}</div>
        <div className="mt-1 truncate text-sm text-slate-500">{label}</div>
        {hint && <div className="truncate text-xs text-slate-400">{hint}</div>}
      </div>
    </div>
  );
};

export const Row = ({ k, v }) => (
  <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 text-sm last:border-0">
    <span className="shrink-0 text-slate-500">{k}</span><span className="text-right font-medium text-slate-900 break-words">{v ?? '—'}</span>
  </div>
);

export const Empty = ({ icon = 'file', children }) => (
  <div className="grid place-items-center gap-2 py-12 text-center text-slate-500">
    <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100"><Icon name={icon} size={22} /></span>
    <p className="max-w-sm text-sm">{children}</p>
  </div>
);

export const Notice = ({ tone = 'info', title, children }) => {
  const t = {
    info: 'bg-sky-50 text-sky-900 ring-sky-200', warn: 'bg-amber-50 text-amber-900 ring-amber-200',
    ok: 'bg-teal-50 text-teal-900 ring-teal-200', bad: 'bg-red-50 text-red-800 ring-red-200',
  }[tone];
  return (
    <div className={`flex gap-3 rounded-xl p-4 text-sm ring-1 ${t}`}>
      <Icon name={tone === 'ok' ? 'check' : tone === 'info' ? 'info' : 'alert'} size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{title && <p className="font-semibold">{title}</p>}<div>{children}</div></div>
    </div>
  );
};

/* ---------- forms ---------- */
export const Field = ({ label, error, hint, children }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium text-slate-700">{label}</span>
    {children}
    {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
  </label>
);

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:bg-slate-100';

export const Button = ({ variant = 'primary', loading, className = '', children, type = 'button', ...p }) => {
  const v = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800',
    secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    dangerOutline: 'bg-white text-red-600 ring-1 ring-red-300 hover:bg-red-50',
    gold: 'bg-gold-500 text-brand-900 hover:bg-gold-400',
  }[variant];
  return (
    <button type={type} {...p} disabled={loading || p.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${v} ${className}`}>
      {loading ? 'Please wait…' : children}
    </button>
  );
};

/* ---------- modal ---------- */
export const Modal = ({ open, onClose, title, children, footer, dismissible = true }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/50 p-4" onMouseDown={(e) => dismissible && e.target === e.currentTarget && onClose()}>
      <div className="pop w-full max-w-md rounded-xl bg-white shadow-xl" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {dismissible && <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close"><Icon name="x" size={18} /></button>}
        </div>
        <div className="px-5 py-4 text-sm text-slate-600">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};

/* ---------- copy to clipboard chip ---------- */
export const CopyChip = ({ text, className = '' }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard may be blocked */ }
    setDone(true); setTimeout(() => setDone(false), 1500);
  };
  return (
    <button type="button" onClick={copy} className={`inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700 hover:bg-slate-200 ${className}`} title="Click to copy">
      {text}<Icon name={done ? 'check' : 'copy'} size={13} />
    </button>
  );
};

/* ---------- image preview with a show / hide toggle ---------- */
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)(\?.*)?$/i;

/**
 * "Show preview / Hide preview" toggle for an uploaded image.
 * Pass `file` (a File the user just picked) or `url` (an already uploaded file).
 * Hidden by default; the preview expands when toggled on and collapses when toggled off.
 * Non-image files (e.g. PDF) render nothing.
 */
export const ImagePreview = ({ file, url, label = 'preview', className = '' }) => {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const isImage = file ? file.type.startsWith('image/') : !!url && IMAGE_EXT.test(url);
  const objectUrl = useMemo(() => (file && isImage ? URL.createObjectURL(file) : null), [file, isImage]);
  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);
  useEffect(() => setBroken(false), [file, url]);

  if (!isImage) return null;
  const src = objectUrl || safeUrl(url);

  return (
    <div className={className}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
        <Icon name={open ? 'eyeOff' : 'eye'} size={14} />{open ? `Hide ${label}` : `Show ${label}`}
      </button>
      {/* grid-rows 0fr -> 1fr animates the collapse; the image is only requested once it is first shown */}
      <div className={`grid transition-[grid-template-rows] duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} aria-hidden={!open}>
        <div className="overflow-hidden">
          {(open || src) && (
            <div className="pt-2">
              {broken
                ? <p className="text-xs text-red-600">This image could not be loaded.</p>
                : <img src={open ? src : undefined} alt="Uploaded file preview" onError={() => setBroken(true)}
                    className="max-h-72 max-w-full rounded-lg bg-slate-50 object-contain ring-1 ring-slate-200" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
