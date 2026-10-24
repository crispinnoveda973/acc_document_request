import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { PAYMENT_STATUSES, STATUSES, errMsg, fmt, peso } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Avatar, Button, Card, Empty, PageHeader, Spinner, StatusBadge, inputCls } from '../../components/ui';

export default function AdminRequests() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({
    search: params.get('search') || '', status: params.get('status') || '', payment_status: params.get('payment_status') || '',
    document_type_id: '', date_from: '', date_to: '', trashed: false,
  });
  const [page, setPage] = useState(1);
  const [types, setTypes] = useState([]);
  const [res, setRes] = useState(null);

  useEffect(() => { api.get('/document-types').then((r) => setTypes(r.data.data)); }, []);

  useEffect(() => {
    setRes(null);
    const t = setTimeout(() => {
      const q = { page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== false)) };
      api.get('/admin/requests', { params: q }).then((r) => setRes(r.data)).catch((e) => toast(errMsg(e), 'error'));
    }, 250);
    return () => clearTimeout(t);
  }, [filters, page]);

  const set = (k, v) => { setFilters({ ...filters, [k]: v }); setPage(1); };

  return (
    <div className="space-y-6">
      <PageHeader title="Document requests" subtitle="Search, filter and process every request." />
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          <input className={`${inputCls} 2xl:col-span-2`} placeholder="Search transaction no., reference, name, student ID…" value={filters.search} onChange={(e) => set('search', e.target.value)} />
          <select className={inputCls} value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className={inputCls} value={filters.payment_status} onChange={(e) => set('payment_status', e.target.value)}>
            <option value="">All payments</option>{PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className={inputCls} value={filters.document_type_id} onChange={(e) => set('document_type_id', e.target.value)}>
            <option value="">All documents</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" className={inputCls} value={filters.date_from} onChange={(e) => set('date_from', e.target.value)} title="From" />
          <input type="date" className={inputCls} value={filters.date_to} onChange={(e) => set('date_to', e.target.value)} title="To" />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={filters.trashed} onChange={(e) => set('trashed', e.target.checked)} /> Show trashed (soft-deleted) requests
        </label>
      </Card>

      <Card flush>
        {!res ? <Spinner /> : res.data.length === 0 ? <Empty>No requests found.</Empty> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-3">Transaction no.</th><th>Student</th><th>Document</th><th>Amount</th><th>Payment</th><th>Status</th><th>Claimed by</th><th className="pr-5">Submitted</th></tr>
                </thead>
                <tbody>
                  {res.data.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-5 py-3.5"><Link className="font-mono text-xs font-semibold text-brand-700 underline" to={`/requests/${r.id}`}>{r.transaction_number}</Link><div className="text-xs text-slate-400">{r.reference_number}</div></td>
                      <td><div className="flex items-center gap-3"><Avatar user={r.student} size={36} /><div className="font-medium text-slate-900">{r.student?.name}<div className="text-xs font-normal text-slate-500">{r.student?.student_number}</div></div></div></td>
                      <td>{r.document_type?.name}<div className="text-xs text-slate-500">{r.copies} {r.copies > 1 ? 'copies' : 'copy'}</div></td>
                      <td className="whitespace-nowrap">{peso(r.amount)}<div className="text-xs text-slate-500">{r.payment_method}</div></td>
                      <td><StatusBadge status={r.payment_status} /></td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className="whitespace-nowrap text-slate-600">{r.pickup_by === 'representative' ? 'Representative' : 'Student'}</td>
                      <td className="whitespace-nowrap pr-5 text-slate-500">{fmt(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm">
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
