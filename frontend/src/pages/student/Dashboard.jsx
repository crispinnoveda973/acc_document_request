import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { FINAL, READY, errMsg, fmt, fmtDate, peso } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import useSettings from '../../useSettings';
import { Button, Card, CopyChip, Empty, Icon, Notice, Spinner, StatCard, StatusBadge } from '../../components/ui';

export default function StudentDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState(null);
  const [s] = useSettings();
  const [busyId, setBusyId] = useState(null);

  const load = () => api.get('/student/requests').then((r) => setItems(r.data.data)).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => { load(); }, []);

  const cancel = async (r) => {
    const ok = await confirm({
      title: 'Cancel this request?', danger: true, withReason: true, confirmText: 'Yes, cancel request', cancelText: 'Keep request',
      message: `${r.document_type?.name} · ${r.transaction_number}. This cannot be undone.`,
    });
    if (!ok) return;
    setBusyId(r.id);
    try { await api.post(`/student/requests/${r.id}/cancel`, { reason: ok.reason }); toast('Request cancelled.'); await load(); }
    catch (e) { toast(errMsg(e), 'error'); }
    finally { setBusyId(null); }
  };

  const count = (f) => (items || []).filter(f).length;
  const ready = (items || []).filter((r) => r.status === READY);
  const steps = (s?.claim_steps || '').split('\n').filter(Boolean).slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 p-7 text-white shadow-lg sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gold-500/20" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-gold-400">Abuyog Community College</p>
            <h1 className="mt-1 text-3xl font-extrabold">Hello, {user.name.split(' ')[0]}!</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">Request school documents, pay online and track every request using its transaction number.</p>
          </div>
          <Link to="/new"><Button variant="gold" className="px-6 py-3 text-base"><Icon name="plus" size={18} />New Request</Button></Link>
        </div>
      </section>

      {ready.length > 0 && (
        <Notice tone="ok" title={`${ready.length} document${ready.length > 1 ? 's are' : ' is'} ready for pick-up!`}>
          {ready.map((r) => <div key={r.id}>{r.document_type?.name} — pick-up on <b>{fmtDate(r.pickup_date)}</b> (<Link className="underline" to={`/requests/${r.id}`}>{r.transaction_number}</Link>)</div>)}
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total requests" value={items ? items.length : '–'} icon="file" />
        <StatCard label="In progress" value={items ? count((r) => !FINAL.includes(r.status) && r.status !== READY) : '–'} icon="clock" tone="amber" />
        <StatCard label="Ready for pick-up" value={items ? ready.length : '–'} icon="check" tone="teal" />
        <StatCard label="Completed" value={items ? count((r) => r.status === 'Completed') : '–'} icon="check" tone="sky" />
      </div>

      <div className="grid gap-6 2xl:grid-cols-3">
        <Card title="My Requests" flush className="2xl:col-span-2">
          {!items ? <Spinner /> : items.length === 0 ? (
            <Empty icon="file">You have no requests yet. Click “New Request” to start.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-3">Transaction no.</th><th>Document</th><th>Amount</th><th>Payment</th><th>Status</th><th>Submitted</th><th className="pr-5" /></tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-5 py-3.5"><CopyChip text={r.transaction_number} /></td>
                      <td className="font-medium text-slate-900">{r.document_type?.name}<div className="text-xs font-normal text-slate-500">{r.copies} {r.copies > 1 ? 'copies' : 'copy'}</div></td>
                      <td className="whitespace-nowrap">{peso(r.amount)}</td>
                      <td><StatusBadge status={r.payment_status} /></td>
                      <td><StatusBadge status={r.status} />{r.status === READY && r.pickup_date && <div className="mt-1 text-xs text-teal-700">{fmtDate(r.pickup_date)}</div>}</td>
                      <td className="whitespace-nowrap text-slate-500">{fmt(r.created_at)}</td>
                      <td className="space-x-2 whitespace-nowrap pr-5 text-right">
                        <Link to={`/requests/${r.id}`} className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100">View</Link>
                        {r.status === 'Pending' && (
                          <button onClick={() => cancel(r)} disabled={busyId === r.id}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50">
                            {busyId === r.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="How to claim" actions={<Link to="/how-to-claim" className="text-sm font-medium text-brand-700 underline">See all</Link>}>
            {steps.length === 0 ? <p className="text-sm text-slate-500">Steps will appear here once posted by the admin.</p> : (
              <ol className="space-y-3">
                {steps.map((t, i) => (
                  <li key={i} className="flex gap-3 text-sm"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span><span className="text-slate-600">{t}</span></li>
                ))}
              </ol>
            )}
            <div className="mt-4"><Notice tone="warn">Someone else claiming for you? They must bring your <b>authorization letter</b>.</Notice></div>
          </Card>
          <Card title="About ACC" actions={<Link to="/about" className="text-sm font-medium text-brand-700 underline">More</Link>}>
            <p className="line-clamp-4 text-sm leading-relaxed text-slate-600">{s?.about_text}</p>
            {s?.office_hours && <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Icon name="clock" size={14} />{s.office_hours}</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
