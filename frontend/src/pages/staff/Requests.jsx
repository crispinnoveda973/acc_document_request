import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { STATUSES, errMsg, fmt } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Button, Card, Spinner, StatusBadge, inputCls } from '../../components/ui';

export default function StaffRequests() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ search: '', status: params.get('status') || '', document_type_id: '', date_from: '', date_to: '', trashed: false });
  const [page, setPage] = useState(1);
  const [types, setTypes] = useState([]);
  const [res, setRes] = useState(null);

  useEffect(() => { api.get('/document-types').then((r) => setTypes(r.data.data)); }, []);

  useEffect(() => {
    setRes(null);
    const t = setTimeout(() => {
      const q = { page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== false)) };
      api.get('/staff/requests', { params: q }).then((r) => setRes(r.data)).catch((e) => toast(errMsg(e), 'error'));
    }, 250);
    return () => clearTimeout(t);
  }, [filters, page]);

  const set = (k, v) => { setFilters({ ...filters, [k]: v }); setPage(1); };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Document Requests</h1>
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input className={`${inputCls} lg:col-span-2`} placeholder="Search reference, name, student ID…" value={filters.search} onChange={(e) => set('search', e.target.value)} />
          <select className={inputCls} value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className={inputCls} value={filters.document_type_id} onChange={(e) => set('document_type_id', e.target.value)}>
            <option value="">All documents</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" className={inputCls} value={filters.date_from} onChange={(e) => set('date_from', e.target.value)} title="From" />
          <input type="date" className={inputCls} value={filters.date_to} onChange={(e) => set('date_to', e.target.value)} title="To" />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filters.trashed} onChange={(e) => set('trashed', e.target.checked)} /> Show trashed (soft-deleted) requests
        </label>
      </Card>

      <Card>
        {!res ? <Spinner /> : res.data.length === 0 ? <p className="py-8 text-center text-slate-500">No requests found.</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2">Reference</th><th>Student</th><th>Document</th><th>Copies</th><th>Status</th><th>Submitted</th></tr></thead>
                <tbody>
                  {res.data.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-3"><Link className="font-mono text-xs text-brand-700 underline" to={`/requests/${r.id}`}>{r.reference_number}</Link></td>
                      <td>{r.student?.name}<div className="text-xs text-slate-500">{r.student?.student_number}</div></td>
                      <td>{r.document_type?.name}</td><td>{r.copies}</td>
                      <td><StatusBadge status={r.status} /></td><td className="whitespace-nowrap">{fmt(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-slate-500">Page {res.meta.current_page} of {res.meta.last_page} · {res.meta.total} total</span>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="secondary" disabled={page >= res.meta.last_page} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
