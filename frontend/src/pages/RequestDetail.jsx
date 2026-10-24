import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api, { FINAL, NEEDS_VERIFIED_PAYMENT, ONLINE_METHODS, READY, REF_RULES, STATUSES, errMsg, fieldErrors, fmt, fmtDate, peso, refError, safeUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import useSettings from '../useSettings';
import { PaymentInstructions } from './student/NewRequest';
import { Avatar, Button, Card, CopyChip, Field, Icon, ImagePreview, Notice, Row, Spinner, StatusBadge, inputCls } from '../components/ui';

const FileLink = ({ url, label = 'Open file' }) =>
  url ? (
    <div className="flex flex-col items-end gap-1.5">
      <a className="font-semibold text-brand-700 underline" href={safeUrl(url)} target="_blank" rel="noopener noreferrer">{label}</a>
      <ImagePreview url={url} label="preview" className="flex flex-col items-end" />
    </div>
  ) : 'None';

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const { state } = useLocation();
  const isAdmin = user.role === 'admin';
  const base = isAdmin ? '/admin/requests' : '/student/requests';
  const [settings] = useSettings();

  const [req, setReq] = useState(null);
  const [status, setStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pay, setPay] = useState({ payment_method: 'GCash', payment_reference: '', file: null });
  const [rejectReason, setRejectReason] = useState('');
  const [payOnline, setPayOnline] = useState(false);   // a student who chose Cash can still switch to GCash / bank
  const [payErr, setPayErr] = useState({});

  const load = () =>
    api.get(`${base}/${id}`).then((r) => {
      setReq(r.data.data);
      setPay((p) => ({ ...p, payment_method: ONLINE_METHODS.includes(r.data.data.payment_method) ? r.data.data.payment_method : 'GCash' }));
    }).catch((e) => { toast(errMsg(e), 'error'); nav('/'); });
  useEffect(() => { load(); }, [id]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { const r = await fn(); if (r?.data?.data) setReq(r.data.data); toast(okMsg); return true; }
    catch (e) { toast(errMsg(e), 'error'); return false; }
    finally { setBusy(false); }
  };

  if (!req) return <Spinner />;
  const final = FINAL.includes(req.status);
  const trashed = !!req.deleted_at;
  const cash = req.payment_method === 'Cash';

  const setTo = async (s) => {
    if (s === 'Rejected' && !remarks.trim()) return toast('Please enter a reason for rejection in the remarks box.', 'error');
    if (await run(() => api.patch(`${base}/${id}/status`, { status: s, remarks }), s === READY ? 'Marked as ready to pick up.' : `Status updated to ${s}.`)) { setRemarks(''); setStatus(''); }
  };

  const decidePayment = async (payment_status, okMsg) => {
    if (payment_status === 'Rejected' && !rejectReason.trim()) return toast('Please enter the reason the payment is rejected.', 'error');
    if (await run(() => api.patch(`${base}/${id}/payment`, { payment_status, remarks: rejectReason.trim() || undefined }), okMsg)) setRejectReason('');
  };

  const cancel = async () => {
    const ok = await confirm({
      title: 'Cancel this request?', danger: true, withReason: true, confirmText: 'Yes, cancel request', cancelText: 'Keep request',
      message: `Request ${req.transaction_number} will be cancelled. This cannot be undone.`,
    });
    if (ok) run(() => api.post(`${base}/${id}/cancel`, { reason: ok.reason }), 'Request cancelled.');
  };

  const sendPayment = async (e) => {
    e.preventDefault(); setPayErr({});
    // Check the reference format before sending (the API checks it again).
    const refProblem = refError(pay.payment_method, pay.payment_reference);
    if (!pay.payment_reference && !pay.file) { setPayErr({ payment_reference: 'Enter your payment reference number or upload your receipt.' }); return toast('Enter your payment reference number or upload your receipt.', 'error'); }
    if (refProblem) { setPayErr({ payment_reference: refProblem }); return toast(refProblem, 'error'); }
    const fd = new FormData();
    fd.append('payment_method', pay.payment_method);
    if (pay.payment_reference) fd.append('payment_reference', pay.payment_reference);
    if (pay.file) fd.append('payment_proof', pay.file);
    setBusy(true);
    try { const r = await api.post(`${base}/${id}/payment`, fd); setReq(r.data.data); setPay({ ...pay, payment_reference: '', file: null }); toast('Payment details sent. The admin will verify it.'); }
    catch (err) { setPayErr(fieldErrors(err)); toast(errMsg(err), 'error'); }
    finally { setBusy(false); }
  };

  const canPay = !isAdmin && !final && req.payment_status !== 'Verified' && (!cash || payOnline);
  // Paid documents cannot be released (ready / completed) until the payment is verified; the API enforces this too.
  const blockedByPayment = NEEDS_VERIFIED_PAYMENT.includes(status) && Number(req.amount) > 0 && req.payment_status !== 'Verified';

  return (
    <div className="space-y-6">
      <Link to={isAdmin ? '/requests' : '/'} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">← Back</Link>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transaction number</div>
          <CopyChip text={req.transaction_number} className="mt-1 !px-3 !py-1.5 !text-base" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</div>
          <div className="mt-1 font-mono text-sm font-semibold text-slate-700">{req.reference_number}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={req.status} />
          {trashed && <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">In trash</span>}
        </div>
      </div>

      {state?.justCreated && (
        <Notice tone="ok" title="Request submitted!">
          Keep your transaction number <b>{req.transaction_number}</b>. You will need it to track and claim your document.
          {req.payment_status === 'Unpaid' && ' Don\u2019t forget to pay and send your payment details below.'}
        </Notice>
      )}
      {req.status === 'Rejected' && req.rejection_reason && <Notice tone="bad" title="Request rejected">{req.rejection_reason}</Notice>}
      {req.status === READY && (
        <Notice tone="ok" title="Ready to pick up.">
          {!isAdmin && <>{settings?.office_hours && <>Office hours: {settings.office_hours}. </>}Bring your transaction number{req.pickup_by === 'self' ? ' and a valid ID.' : ', a valid ID, and the signed authorization letter.'}
          {' '}<Link to="/how-to-claim" className="font-semibold underline">How to claim</Link></>}
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Request details" actions={isAdmin && !final && !trashed && !edit && (
            <button className="text-sm font-medium text-brand-700 underline" onClick={() => setEdit({ copies: req.copies, purpose: req.purpose, preferred_claim_date: req.preferred_claim_date || '' })}>Edit</button>)}>
            {edit ? (
              <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api.put(`${base}/${id}`, { ...edit, preferred_claim_date: edit.preferred_claim_date || null }), 'Request updated.')) setEdit(null); }}>
                <Field label="Copies"><input type="number" min="1" max="10" className={inputCls} value={edit.copies} onChange={(e) => setEdit({ ...edit, copies: e.target.value })} /></Field>
                <Field label="Purpose"><input className={inputCls} value={edit.purpose} onChange={(e) => setEdit({ ...edit, purpose: e.target.value })} /></Field>
                <Field label="Preferred claim date"><input type="date" className={inputCls} value={edit.preferred_claim_date} onChange={(e) => setEdit({ ...edit, preferred_claim_date: e.target.value })} /></Field>
                <div className="flex gap-2"><Button type="submit" loading={busy}>Save</Button><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button></div>
              </form>
            ) : (<>
              <Row k="Document" v={req.document_type?.name} />
              <Row k="Fee (per copy)" v={peso(req.document_type?.fee)} />
              <Row k="Copies" v={req.copies} />
              <Row k="Total amount" v={<span className="text-brand-700">{peso(req.amount)}</span>} />
              <Row k="Purpose" v={req.purpose} />
              <Row k="Preferred claim date" v={fmtDate(req.preferred_claim_date)} />
              <Row k="Submitted" v={fmt(req.created_at)} />
              <Row k="Processed by" v={req.processor} />
              <Row k="Attachment" v={<FileLink url={req.attachment_url} />} />
            </>)}
          </Card>

          <Card title="Payment" actions={<StatusBadge status={req.payment_status} />}>
            <Row k="Method" v={req.payment_method} />
            <Row k="Amount to pay" v={peso(req.amount)} />
            <Row k="Reference no." v={req.payment_reference} />
            <Row k="Receipt / proof" v={<FileLink url={req.payment_proof_url} label="View receipt" />} />
            {!cash && req.payment_submitted_at && <Row k="Details sent" v={fmt(req.payment_submitted_at)} />}
            {req.payment_verified_at && <Row k={cash ? 'Cash recorded' : 'Verified'} v={`${fmt(req.payment_verified_at)}${req.payment_verified_by ? ` by ${req.payment_verified_by}` : ''}`} />}
            {req.payment_status === 'Rejected' && <Row k="Rejection reason" v={req.payment_remarks} />}

            {!isAdmin && !final && (
              <div className="mt-3">
                {req.payment_status === 'Unpaid' && cash && !payOnline && (
                  <Notice tone="warn" title="Pay in cash at the college office">
                    Pay {peso(req.amount)} at the office{settings?.office_hours ? ` (${settings.office_hours})` : ''}. The admin will record your payment.
                    {' '}<button type="button" className="font-semibold underline" onClick={() => setPayOnline(true)}>Pay with GCash / bank transfer instead</button>
                  </Notice>
                )}
                {req.payment_status === 'Unpaid' && !cash && <Notice tone="warn" title="Payment needed">Pay {peso(req.amount)} then send your reference number or receipt below.</Notice>}
                {req.payment_status === 'Pending Verification' && <Notice tone="info" title="Pending verification">The admin is checking your payment. You will be notified once it is verified.</Notice>}
                {req.payment_status === 'Rejected' && <Notice tone="bad" title="Payment rejected">{req.payment_remarks ? `${req.payment_remarks} ` : ''}Please check your details and send them again below.</Notice>}
                {req.payment_status === 'Verified' && <Notice tone="ok" title={cash ? 'Cash payment recorded' : 'Payment verified'}>Thank you! Your payment has been confirmed.</Notice>}
              </div>
            )}
            {isAdmin && !final && !trashed && !cash && ['Unpaid', 'Rejected'].includes(req.payment_status) && (
              <div className="mt-3"><Notice tone="warn">{req.payment_status === 'Rejected' ? 'You rejected this payment. Waiting for the student to send new payment details.' : 'The student has not sent any payment details yet, so there is nothing to verify.'}</Notice></div>
            )}
            {isAdmin && !final && !trashed && cash && req.payment_status !== 'Verified' && (
              <div className="mt-3"><Notice tone="info">Cash is paid at the college office. Click “Record cash payment” once you have received {peso(req.amount)}.</Notice></div>
            )}

            {isAdmin && !final && !trashed && cash && (
              <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                {req.payment_status !== 'Verified'
                  ? <Button disabled={busy} onClick={() => decidePayment('Verified', 'Cash payment recorded.')}><Icon name="check" size={16} />Record cash payment</Button>
                  : <Button variant="dangerOutline" disabled={busy} onClick={() => decidePayment('Unpaid', 'Cash record removed.')}>Undo cash record</Button>}
              </div>
            )}

            {isAdmin && !final && !trashed && !cash && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <Field label="Reason (required to reject a payment)">
                  <input className={inputCls} value={rejectReason} maxLength="500" onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Reference number not found, wrong amount" />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy || req.payment_status !== 'Pending Verification'} onClick={() => decidePayment('Verified', 'Payment verified.')}>
                    <Icon name="check" size={16} />Verify payment
                  </Button>
                  <Button variant="dangerOutline" disabled={busy || !['Pending Verification', 'Verified'].includes(req.payment_status)} onClick={() => decidePayment('Rejected', 'Payment rejected.')}>
                    Reject payment
                  </Button>
                </div>
              </div>
            )}

            {canPay && (
              <form onSubmit={sendPayment} className="mt-4 space-y-3 border-t pt-4">
                <p className="text-sm font-semibold text-slate-900">{req.payment_status === 'Pending Verification' ? 'Update your payment details' : 'Send your payment details'}</p>
                <Field label="Payment method" error={payErr.payment_method}>
                  <select className={inputCls} value={pay.payment_method} onChange={(e) => setPay({ ...pay, payment_method: e.target.value })}>
                    {ONLINE_METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <PaymentInstructions method={pay.payment_method} s={settings} amount={req.amount} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Payment reference no." error={payErr.payment_reference} hint={REF_RULES[pay.payment_method].hint}><input className={inputCls} value={pay.payment_reference} onChange={(e) => setPay({ ...pay, payment_reference: e.target.value })} maxLength="80" inputMode={pay.payment_method === 'GCash' ? 'numeric' : 'text'} /></Field>
                  <div className="space-y-2">
                    <Field label="Receipt / screenshot" error={payErr.payment_proof}><input type="file" accept=".pdf,.jpg,.jpeg,.png" className={inputCls} onChange={(e) => setPay({ ...pay, file: e.target.files[0] || null })} /></Field>
                    <ImagePreview file={pay.file} label="receipt preview" />
                  </div>
                </div>
                <Button type="submit" loading={busy}>Send payment details</Button>
              </form>
            )}
          </Card>

          <Card title="Pick-up">
            <Row k="Who will pick up" v={req.pickup_by === 'self' ? 'The requesting student' : 'Authorized representative'} />
            {req.pickup_by === 'representative' && (<>
              <Row k="Representative" v={req.representative_name} />
              <Row k="Authorization letter" v={req.authorization_letter_url ? <FileLink url={req.authorization_letter_url} label="View uploaded letter" /> : 'To be submitted at pick-up'} />
              <div className="mt-3"><Notice tone="warn">The owner will not pick up this document, so the representative <b>must bring an authorization letter</b> signed by the student.</Notice></div>
            </>)}
          </Card>

          <Card title="Status timeline">
            <ol className="relative space-y-6 border-l-2 border-brand-600/25 pl-6">
              {req.histories?.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full bg-brand-600 ring-4 ring-white" />
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={h.new_status} />
                    {h.old_status === h.new_status && <span className="text-xs text-slate-500">(note)</span>}
                    <span className="text-xs text-slate-500">{fmt(h.created_at)}</span>
                  </div>
                  {h.remarks && <p className="mt-1 text-sm text-slate-700">{h.remarks}</p>}
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                    {h.by && <Avatar user={{ name: h.by, avatar_url: h.by_avatar_url }} size={20} />}
                    by {h.by || 'system'}{h.role ? ` (${h.role === 'admin' ? 'admin' : 'student'})` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          {isAdmin && (
            <Card title="Student">
              <div className="mb-3 flex items-center gap-4 border-b border-slate-100 pb-4">
                <Avatar user={req.student} size={72} className="ring-4 ring-brand-100" />
                <div className="min-w-0"><div className="truncate font-semibold text-slate-900">{req.student?.name}</div><div className="text-xs text-slate-500">{req.student?.avatar_url ? 'Profile picture' : 'No profile picture yet'}</div></div>
              </div>
              <Row k="Name" v={req.student?.name} />
              <Row k="Student ID" v={req.student?.student_number} />
              <Row k="Course" v={req.student?.course} />
              <Row k="Year" v={req.student?.year_level} />
              <Row k="Email" v={req.student?.email} />
              <Row k="Contact" v={req.student?.contact_number} />
            </Card>
          )}

          {isAdmin && !trashed && (
            <Card title="Process request">
              <div className="space-y-3">
                {!final && (
                  <Field label="Change status">
                    <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="">— Select —</option>
                      {STATUSES.filter((s) => s !== req.status).map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                )}
                {blockedByPayment && <Notice tone="warn">Confirm the student's payment first — a paid document cannot be marked “{status}” before that.</Notice>}
                <Field label={`Remarks${status === 'Rejected' ? ' (required)' : ''}`}>
                  <textarea rows="3" className={inputCls} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </Field>
                {!final && (
                  <div className="flex flex-wrap gap-2">
                    <Button loading={busy} disabled={!status || blockedByPayment} onClick={() => setTo(status)}>Update status</Button>
                    {req.status === 'Pending' && <Button variant="secondary" disabled={busy} onClick={() => setTo('Approved')}>Approve</Button>}
                    <Button variant="dangerOutline" disabled={busy} onClick={() => setTo('Rejected')}>Reject</Button>
                  </div>
                )}
                <Button variant="secondary" disabled={!remarks.trim() || busy}
                  onClick={async () => { if (await run(() => api.post(`${base}/${id}/remarks`, { remarks }), 'Remark added.')) setRemarks(''); }}>
                  Add remark only
                </Button>
              </div>
            </Card>
          )}

          {isAdmin && (
            <Button variant={trashed ? 'secondary' : 'dangerOutline'} className="w-full"
              onClick={async () => {
                if (trashed) { await run(() => api.post(`${base}/${id}/restore`), 'Request restored.'); load(); return; }
                const ok = await confirm({ title: 'Move to trash?', message: 'You can restore it later from the “Show trashed” filter.', danger: true, confirmText: 'Move to trash', cancelText: 'Cancel' });
                if (!ok) return;
                try { await api.delete(`${base}/${id}`); toast('Moved to trash.'); nav('/requests'); } catch (e) { toast(errMsg(e), 'error'); }
              }}>
              <Icon name="trash" size={16} />{trashed ? 'Restore request' : 'Move to trash'}
            </Button>
          )}

          {!isAdmin && !final && (
            <Card title="Need to cancel?">
              {req.status === 'Pending' ? (
                <>
                  <p className="mb-3 text-sm text-slate-600">You can cancel while your request is still <b>Pending</b>.</p>
                  <Button variant="danger" className="w-full" loading={busy} onClick={cancel}>Cancel request</Button>
                </>
              ) : (
                <p className="text-sm text-slate-600">This request is already being processed and can no longer be cancelled online. Please contact the college office.</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
