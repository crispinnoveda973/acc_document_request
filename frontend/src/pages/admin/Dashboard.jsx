import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { READY, errMsg, fmt, fmtDate, peso } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card, Empty, Icon, Notice, PageHeader, Spinner, StatCard, StatusBadge } from '../../components/ui';

const BAR = {
  Pending: 'bg-amber-400', 'Under Review': 'bg-sky-400', Approved: 'bg-emerald-400', Processing: 'bg-indigo-400',
  'Ready for Pick-up': 'bg-teal-500', Completed: 'bg-green-600', Rejected: 'bg-red-400', Cancelled: 'bg-slate-400',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [s, setS] = useState(null);

  const load = () => api.get('/admin/stats').then((r) => setS(r.data)).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);
  if (!s) return <Spinner />;

  const pending = s.counts.Pending;
  const max = Math.max(1, ...Object.values(s.counts));

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="Overview of all document requests." />

      {pending > 0 && (
        <Notice tone="warn" title={`${pending} new request${pending > 1 ? 's' : ''} waiting for review`}>
          <Link to="/requests?status=Pending" className="font-semibold underline">Review pending requests →</Link>
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-5">
        <Link to="/requests"><StatCard label="All requests" value={s.total} icon="file" /></Link>
        <Link to="/requests?status=Pending"><StatCard label="Pending (new)" value={pending} icon="bell" tone="amber" hint={`${s.today} submitted today`} /></Link>
        <Link to="/requests?payment_status=For%20Verification"><StatCard label="Payments to verify" value={s.payments_to_verify} icon="wallet" tone="sky" /></Link>
        <Link to={`/requests?status=${encodeURIComponent(READY)}`}><StatCard label="Ready for pick-up" value={s.counts[READY]} icon="check" tone="teal" /></Link>
        <Link to="/requests?status=Completed"><StatCard label="Completed" value={s.counts.Completed} icon="check" tone="brand" /></Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Needs your attention" subtitle="Oldest pending requests first" className="xl:col-span-2" flush
          actions={<Link to="/requests?status=Pending" className="text-sm font-medium text-brand-700 underline">View all</Link>}>
          {s.pending.length === 0 ? <Empty icon="check">All caught up — no pending requests.</Empty> : (
            <ul className="divide-y divide-slate-100">
              {s.pending.map((r) => (
                <li key={r.id}>
                  <Link to={`/requests/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{r.document_type?.name} <span className="font-normal text-slate-500">· {r.copies} {r.copies > 1 ? 'copies' : 'copy'}</span></div>
                      <div className="text-sm text-slate-500">{r.student?.name} · {r.student?.student_number}</div>
                    </div>
                    <div className="text-right text-sm">
                      <StatusBadge status={r.payment_status} />
                      <div className="mt-1 text-xs text-slate-500">{peso(r.amount)} · {fmt(r.created_at)}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Requests by status">
          <div className="space-y-3">
            {Object.entries(s.counts).map(([k, v]) => (
              <Link key={k} to={`/requests?status=${encodeURIComponent(k)}`} className="block">
                <div className="mb-1 flex justify-between text-sm"><span className="text-slate-600">{k}</span><span className="font-semibold">{v}</span></div>
                <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${BAR[k]}`} style={{ width: `${(v / max) * 100}%` }} /></div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Upcoming pick-ups" subtitle="Sorted by pick-up date" flush>
          {s.ready.length === 0 ? <Empty icon="calendar">No documents are waiting for pick-up.</Empty> : (
            <ul className="divide-y divide-slate-100">
              {s.ready.map((r) => (
                <li key={r.id}>
                  <Link to={`/requests/${r.id}`} className="block px-5 py-3 hover:bg-slate-50">
                    <div className="text-sm font-semibold text-slate-900">{r.student?.name}</div>
                    <div className="text-xs text-slate-500">{r.document_type?.name}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-teal-700"><Icon name="calendar" size={13} />{fmtDate(r.pickup_date)}{r.pickup_by === 'representative' && ' · representative'}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent requests" className="xl:col-span-2" flush actions={<Link to="/requests" className="text-sm font-medium text-brand-700 underline">View all</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Transaction</th><th>Student</th><th>Document</th><th>Status</th><th className="pr-5">Date</th></tr></thead>
              <tbody>
                {s.recent.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3"><Link className="font-mono text-xs font-semibold text-brand-700 underline" to={`/requests/${r.id}`}>{r.transaction_number}</Link></td>
                    <td>{r.student?.name}</td><td>{r.document_type?.name}</td><td><StatusBadge status={r.status} /></td>
                    <td className="whitespace-nowrap pr-5 text-slate-500">{fmt(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
