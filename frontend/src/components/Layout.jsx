import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api, { fmt } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, Icon, Logo } from './ui';
import YearLevelPrompt from './YearLevelPrompt';

function Bell() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState({ unread: 0, data: [] });
  const [open, setOpen] = useState(false);
  const lastSeen = useRef(null);   // highest notice id we already know about
  const box = useRef(null);

  const load = () => api.get('/notices').then((r) => {
    const list = r.data.data;
    const maxId = list.reduce((m, n) => Math.max(m, n.id), 0);
    // Pop-up alert for brand-new notices (this is how the admin is told about a new document request).
    if (lastSeen.current !== null && maxId > lastSeen.current) {
      list.filter((n) => n.id > lastSeen.current && !n.read_at).slice(0, 3).forEach((n) => toast(`🔔 ${n.message}`, 'info'));
    }
    lastSeen.current = Math.max(lastSeen.current ?? 0, maxId);
    setData(r.data);
  }).catch(() => {});

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const away = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const toggle = () => {
    setOpen(!open);
    if (!open && data.unread) api.post('/notices/read').then(() => setTimeout(load, 1500));
  };

  return (
    <div className="relative" ref={box}>
      <button onClick={toggle} className="relative rounded-full p-2.5 text-slate-600 hover:bg-slate-100" aria-label="Notifications">
        <Icon name="bell" />
        {data.unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white">{data.unread}</span>}
      </button>
      {open && (
        <div className="pop absolute right-0 z-40 mt-2 w-96 max-w-[88vw] overflow-hidden rounded-2xl bg-white text-slate-800 shadow-xl ring-1 ring-slate-200">
          <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
          <div className="max-h-96 overflow-auto">
            {data.data.length === 0 && <p className="p-5 text-center text-sm text-slate-500">No notifications yet.</p>}
            {data.data.map((n) => (
              <Link key={n.id} to={n.document_request_id ? `/requests/${n.document_request_id}` : '#'} onClick={() => setOpen(false)}
                className={`block border-b px-4 py-3 text-sm last:border-0 hover:bg-slate-50 ${n.read_at ? '' : 'bg-brand-50'}`}>
                {n.message}<span className="mt-0.5 block text-xs text-slate-500">{fmt(n.created_at)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [pathname]);

  const isAdmin = user.role === 'admin';
  const links = isAdmin
    ? [['/', 'Dashboard', 'home'], ['/requests', 'All Requests', 'file'], ['/reports', 'Reports', 'chart'], ['/students', 'Students', 'users'], ['/document-types', 'Document Types', 'tag'], ['/how-to-claim', 'How to Claim', 'steps'], ['/settings', 'Site Settings', 'settings'], ['/about', 'About ACC', 'info'], ['/profile', 'My Profile', 'user']]
    : [['/', 'My Requests', 'home'], ['/new', 'New Request', 'plus'], ['/how-to-claim', 'How to Claim', 'steps'], ['/about', 'About ACC', 'info'], ['/profile', 'My Profile', 'user']];

  const cls = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`;

  const Sidebar = (
    <div className="flex h-full flex-col bg-brand-900 text-white">
      <Link to="/" className="flex items-center gap-3 px-5 py-5">
        <Logo size={44} />
        <span className="leading-tight">
          <span className="block text-sm font-bold">Abuyog Community College</span>
          <span className="block text-xs text-gold-400">Document Request</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {links.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === '/'} className={cls}><Icon name={icon} size={19} />{label}</NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <Link to="/profile" title="Change profile picture"><Avatar user={user} size={40} className="ring-2 ring-gold-400" /></Link>
          <div className="min-w-0 text-sm leading-tight">
            <div className="truncate font-semibold">{user.name}</div>
            <div className="text-xs text-white/60">{isAdmin ? 'Administrator' : 'Student'}</div>
          </div>
        </div>
        <button onClick={async () => { await logout(); nav('/login'); }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
          <Icon name="logout" size={17} /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{Sidebar}</aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
          <div className="pop absolute inset-y-0 left-0 w-72 max-w-[85vw]">{Sidebar}</div>
        </div>
      )}

      <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setDrawer(true)} aria-label="Menu"><Icon name="menu" /></button>
          <span className="text-sm font-semibold text-brand-800 lg:hidden">ACC Document Request</span>
          <span className="hidden text-sm text-slate-500 lg:block">{isAdmin ? 'Admin panel' : 'Student portal'} · Abuyog Community College</span>
        </div>
        <Bell />
      </header>

      {!isAdmin && <YearLevelPrompt />}
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8"><Outlet /></main>
      <footer className="no-print px-4 pb-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} Abuyog Community College · Student Document Request System</footer>
    </div>
  );
}
