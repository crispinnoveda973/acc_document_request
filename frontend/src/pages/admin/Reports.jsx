import { useEffect, useState } from 'react';
import api, { errMsg, fmtDate, peso, today } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Button, Card, Empty, Icon, PageHeader, Spinner, inputCls } from '../../components/ui';

const PERIODS = [['day', 'Day'], ['week', 'Week'], ['month', 'Month']];
const short = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

/** "October 20, 2026" | "Oct 19 – Oct 25, 2026" | "October 2026" */
const rangeLabel = (r) => {
  if (r.period === 'day') return fmtDate(r.from);
  if (r.period === 'week') return `${short(r.from)} – ${fmtDate(r.to)}`;
  return new Date(`${r.from}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
};

/** Move the chosen date one day / week / month back or forward. */
const shift = (date, period, dir) => {
  const d = new Date(`${date}T00:00:00`);
  if (period === 'day') d.setDate(d.getDate() + dir);
  else if (period === 'week') d.setDate(d.getDate() + 7 * dir);
  else d.setMonth(d.getMonth() + dir, 1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/**
 * Admin report: number of requests per document type for a day, a week (Mon–Sun) or a month.
 * The API does the counting (GET /api/admin/reports); this page only shows it, and can print it or download it as CSV.
 */
export default function Reports() {
  const toast = useToast();
  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stale = false;
    setData(null);
    api.get('/admin/reports', { params: { period, date } })
      .then((r) => { if (!stale) setData(r.data); })
      .catch((e) => { if (!stale) toast(errMsg(e), 'error'); });
    return () => { stale = true; };
  }, [period, date]);

  const download = async () => {
    setBusy(true);
    try {
      const r = await api.get('/admin/reports/export', { params: { period, date }, responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url; a.download = `document-requests-${period}-${date}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast('Could not download the report. Please try again.', 'error'); }
    finally { setBusy(false); }
  };

  const t = data?.totals;
  const maxDaily = Math.max(1, ...(data?.daily.map((d) => d.count) || [1]));

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="How many documents were requested, by type — per day, week or month."
        actions={
          <div className="no-print flex gap-2">
            <Button variant="secondary" onClick={() => window.print()}><Icon name="printer" size={17} />Print</Button>
            <Button variant="secondary" loading={busy} onClick={download}><Icon name="download" size={17} />Export CSV</Button>
          </div>
        } />

      {/* period + date */}
      <div className="no-print flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-white p-1 ring-1 ring-slate-200" role="tablist" aria-label="Report period">
          {PERIODS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={period === k} onClick={() => setPeriod(k)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${period === k ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded-lg p-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50" onClick={() => setDate(shift(date, period, -1))} aria-label="Previous"><Icon name="chevL" size={18} /></button>
          <input type="date" className={inputCls} style={{ width: "auto" }} value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Report date" />
          <button className="rounded-lg p-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40" disabled={date >= today()} onClick={() => setDate(shift(date, period, 1))} aria-label="Next"><Icon name="chevR" size={18} /></button>
        </div>
        <Button variant="secondary" onClick={() => setDate(today())}>Today</Button>
      </div>

      {!data ? <Spinner /> : (
        <>
          <p className="text-sm text-slate-500">Showing <b className="text-slate-900">{rangeLabel(data)}</b> · requests counted by the day they were submitted.</p>

          {/* day / week / month totals for the chosen date */}
          <div className="no-print grid gap-4 sm:grid-cols-3">
            {PERIODS.map(([k, label]) => (
              <button key={k} onClick={() => setPeriod(k)}
                className={`rounded-xl bg-white p-4 text-left ring-1 transition hover:ring-brand-600/50 ${period === k ? 'ring-2 ring-brand-600' : 'ring-slate-200'}`}>
                <div className="text-sm text-slate-500">This {label.toLowerCase()}</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{data.summary[k].requests}</div>
                <div className="text-xs text-slate-400">requests · {data.summary[k].copies} copies</div>
              </button>
            ))}
          </div>

          <Card title="Requests by document type" subtitle={rangeLabel(data)} flush>
            {t.requests === 0 ? <Empty icon="chart">No document requests in this {period}.</Empty> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr><th>Document type</th><th className="text-right">Requests</th><th className="text-right">Copies</th><th className="text-right">Completed</th><th className="text-right">In progress</th><th className="text-right">Rejected / Cancelled</th><th className="text-right">Payments collected</th></tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.document_type_id} className="border-t border-slate-100">
                        <td className="font-medium text-slate-900">
                          {r.name}
                          <div className="mt-1.5 h-1.5 w-40 max-w-full rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(r.requests / t.requests) * 100}%` }} /></div>
                        </td>
                        <td className="text-right text-base font-bold text-slate-900">{r.requests}</td>
                        <td className="text-right">{r.copies}</td>
                        <td className="text-right">{r.completed}</td>
                        <td className="text-right">{r.in_progress}</td>
                        <td className="text-right">{r.rejected_cancelled}</td>
                        <td className="whitespace-nowrap text-right">{peso(r.collected)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                      <td>Total</td><td className="text-right">{t.requests}</td><td className="text-right">{t.copies}</td><td className="text-right">{t.completed}</td>
                      <td className="text-right">{t.in_progress}</td><td className="text-right">{t.rejected_cancelled}</td><td className="whitespace-nowrap text-right">{peso(t.collected)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          {period !== 'day' && t.requests > 0 && (
            <Card title="Requests per day" subtitle="Each bar is one day">
              <div className="flex h-44 items-end gap-1 overflow-x-auto pb-1">
                {data.daily.map((d) => (
                  <div key={d.date} className="flex h-full min-w-[22px] flex-1 flex-col items-center justify-end gap-1" title={`${fmtDate(d.date)}: ${d.count}`}>
                    <span className="text-[11px] font-semibold text-slate-600">{d.count || ''}</span>
                    <div className={`w-full rounded-t ${d.count ? 'bg-brand-500' : 'bg-slate-100'}`} style={{ height: `${Math.max(d.count ? 6 : 2, (d.count / maxDaily) * 100)}%` }} />
                    <span className="text-[10px] text-slate-400">{new Date(`${d.date}T00:00:00`).getDate()}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
