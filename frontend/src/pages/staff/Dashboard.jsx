import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, fmt } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Card, Spinner, StatusBadge } from '../../components/ui';

export default function StaffDashboard() {
  const toast = useToast();
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/staff/stats').then((r) => setS(r.data)).catch((e) => toast(errMsg(e), 'error')); }, []);
  if (!s) return <Spinner />;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link to="/requests" className="rounded-xl bg-brand-700 p-4 text-white shadow-sm">
          <div className="text-3xl font-bold">{s.total}</div><div className="text-sm opacity-80">All requests</div>
        </Link>
        {Object.entries(s.counts).map(([k, v]) => (
          <Link key={k} to={`/requests?status=${encodeURIComponent(k)}`} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-brand-600">
            <div className="text-3xl font-bold">{v}</div><StatusBadge status={k} />
          </Link>
        ))}
      </div>
      <Card title="Recent Requests" actions={<Link to="/requests" className="text-sm text-brand-700 underline">View all</Link>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2">Reference</th><th>Student</th><th>Document</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {s.recent.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2"><Link className="font-mono text-xs text-brand-700 underline" to={`/requests/${r.id}`}>{r.reference_number}</Link></td>
                  <td>{r.student?.name}</td><td>{r.document_type?.name}</td><td><StatusBadge status={r.status} /></td>
                  <td className="whitespace-nowrap">{fmt(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
