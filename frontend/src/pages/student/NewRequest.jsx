import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { REF_RULES, errMsg, fieldErrors, peso, refError, today } from '../../api';
import { useToast } from '../../context/ToastContext';
import useSettings from '../../useSettings';
import { Button, Card, CopyChip, Field, Icon, ImagePreview, Notice, PageHeader, Spinner, inputCls } from '../../components/ui';

const Choice = ({ active, onClick, title, desc, icon }) => (
  <button type="button" onClick={onClick}
    className={`flex items-start gap-3 rounded-xl p-4 text-left ring-1 transition ${active ? 'bg-brand-50 ring-2 ring-brand-600' : 'bg-white ring-slate-300 hover:bg-slate-50'}`}>
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${active ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600'}`}><Icon name={icon} size={19} /></span>
    <span><span className="block font-semibold text-slate-900">{title}</span><span className="block text-xs text-slate-500">{desc}</span></span>
  </button>
);

export function PaymentInstructions({ method, s, amount }) {
  if (!s) return null;
  if (method === 'Cash') {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
        <p className="font-semibold text-slate-900">Pay {peso(amount)} in cash at the college office.</p>
        <p className="mt-1 text-slate-600">{s.office_hours ? `Office hours: ${s.office_hours}. ` : ''}Bring your transaction number. The admin will record your payment — there is nothing to upload.</p>
      </div>
    );
  }
  // [label, value, copyable] — numbers get a copy button so students can paste them into their GCash / bank app.
  const rows = method === 'GCash'
    ? [['Account name', s.gcash_name], ['GCash number', s.gcash_number, true]]
    : [['Bank', s.bank_name], ['Account name', s.bank_account_name], ['Account number', s.bank_account_number, true]];
  const filled = rows.filter(([, v]) => v);
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="mb-2 text-sm font-semibold text-slate-900">Send {peso(amount)} via {method} to:</p>
      {filled.length === 0
        ? <p className="text-sm text-amber-700">The admin has not added {method} account details yet. Please ask the college office.</p>
        : filled.map(([k, v, copy]) => <div key={k} className="flex items-center justify-between gap-4 border-b border-slate-200 py-1.5 text-sm last:border-0"><span className="text-slate-500">{k}</span>{copy ? <CopyChip text={v} /> : <span className="font-semibold">{v}</span>}</div>)}
      {s.payment_notes && <p className="mt-3 text-xs text-slate-500">{s.payment_notes}</p>}
    </div>
  );
}

export default function NewRequest() {
  const toast = useToast();
  const nav = useNavigate();
  const [types, setTypes] = useState(null);
  const [s] = useSettings();
  const [f, setF] = useState({
    document_type_id: '', copies: 1, purpose: '', preferred_claim_date: '',
    payment_method: 'GCash', payment_reference: '', pickup_by: 'self', representative_name: '',
  });
  const [files, setFiles] = useState({ attachment: null, payment_proof: null, authorization_letter: null });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/document-types').then((r) => setTypes(r.data.data)).catch((e) => toast(errMsg(e), 'error')); }, []);
  if (!types) return <Spinner />;

  const selected = types.find((t) => String(t.id) === String(f.document_type_id));
  const total = selected ? selected.fee * f.copies : 0;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const file = (k) => (e) => setFiles({ ...files, [k]: e.target.files[0] || null });

  const submit = async (e) => {
    e.preventDefault(); setErrors({});
    // Check the reference format before sending (the API checks it again).
    const online = f.payment_method !== 'Cash';
    const refProblem = online ? refError(f.payment_method, f.payment_reference) : null;
    if (refProblem) { setErrors({ payment_reference: refProblem }); return toast(refProblem, 'error'); }
    setBusy(true);
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => v !== '' && !(!online && k === 'payment_reference') && fd.append(k, v));
    Object.entries(files).forEach(([k, v]) => v && !(!online && k === 'payment_proof') && fd.append(k, v));
    try {
      const r = await api.post('/student/requests', fd);
      toast(`Submitted! Your transaction number is ${r.data.data.transaction_number}`);
      nav(`/requests/${r.data.data.id}`, { state: { justCreated: true } });
    } catch (err) { setErrors(fieldErrors(err)); toast(errMsg(err), 'error'); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <PageHeader title="New document request" subtitle="Fill in the details, choose how you will pay, and tell us who will pick it up." />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="1 · Document details">
            <div className="space-y-4">
              <Field label="Document type" error={errors.document_type_id}>
                <select className={inputCls} value={f.document_type_id} onChange={set('document_type_id')} required>
                  <option value="">— Select a document —</option>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              {selected && <Notice tone="info">{selected.description} <b>Fee:</b> {peso(selected.fee)} per copy · <b>Processing:</b> about {selected.processing_days} day(s)</Notice>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Number of copies" error={errors.copies}><input type="number" min="1" max="10" className={inputCls} value={f.copies} onChange={set('copies')} required /></Field>
                <Field label="Preferred claim date" error={errors.preferred_claim_date} hint="The admin will confirm the actual pick-up date."><input type="date" min={today()} className={inputCls} value={f.preferred_claim_date} onChange={set('preferred_claim_date')} /></Field>
              </div>
              <Field label="Purpose" error={errors.purpose}><textarea rows="3" maxLength="255" className={inputCls} value={f.purpose} onChange={set('purpose')} placeholder="e.g. Scholarship application, employment" required /></Field>
              <div className="space-y-2">
                <Field label="Supporting file (optional · PDF/JPG/PNG, max 5MB)" error={errors.attachment}><input type="file" accept=".pdf,.jpg,.jpeg,.png" className={inputCls} onChange={file('attachment')} /></Field>
                <ImagePreview file={files.attachment} label="image preview" />
              </div>
            </div>
          </Card>

          <Card title="2 · Payment method">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Choice icon="phone" title="GCash" desc="Pay using your GCash app" active={f.payment_method === 'GCash'} onClick={() => setF({ ...f, payment_method: 'GCash' })} />
                <Choice icon="wallet" title="Bank Transfer" desc="Deposit or transfer to the college bank account" active={f.payment_method === 'Bank Transfer'} onClick={() => setF({ ...f, payment_method: 'Bank Transfer' })} />
                <Choice icon="home" title="Cash" desc="Pay at the college office" active={f.payment_method === 'Cash'} onClick={() => setF({ ...f, payment_method: 'Cash' })} />
              </div>
              {errors.payment_method && <p className="text-xs text-red-600">{errors.payment_method}</p>}
              <PaymentInstructions method={f.payment_method} s={s} amount={total} />
              {f.payment_method !== 'Cash' ? (<>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Payment reference no. (if already paid)" error={errors.payment_reference} hint={REF_RULES[f.payment_method].hint}><input className={inputCls} value={f.payment_reference} onChange={set('payment_reference')} maxLength="80" inputMode={f.payment_method === 'GCash' ? 'numeric' : 'text'} /></Field>
                  <div className="space-y-2">
                    <Field label="Receipt / screenshot (optional)" error={errors.payment_proof}><input type="file" accept=".pdf,.jpg,.jpeg,.png" className={inputCls} onChange={file('payment_proof')} /></Field>
                    <ImagePreview file={files.payment_proof} label="receipt preview" />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Haven't paid yet? You can submit now and send your payment details later from your request page. The admin checks every GCash and bank payment before it is confirmed.</p>
              </>) : (
                <p className="text-xs text-slate-500">Your payment will be marked as paid once the admin records your cash payment at the office.</p>
              )}
            </div>
          </Card>

          <Card title="3 · Who will pick up the document?">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice icon="user" title="I will pick it up myself" desc="Bring your transaction number and a valid ID" active={f.pickup_by === 'self'} onClick={() => setF({ ...f, pickup_by: 'self' })} />
                <Choice icon="file" title="Someone else will pick it up" desc="Your representative needs an authorization letter" active={f.pickup_by === 'representative'} onClick={() => setF({ ...f, pickup_by: 'representative' })} />
              </div>
              {f.pickup_by === 'representative' && (
                <>
                  <Notice tone="warn" title="Authorization letter required">
                    If you (the owner) will not pick up the document, your representative <b>must bring an authorization letter</b> signed by you. Documents will not be released without it.
                  </Notice>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Representative's full name" error={errors.representative_name}><input className={inputCls} value={f.representative_name} onChange={set('representative_name')} required /></Field>
                    <div className="space-y-2">
                      <Field label="Upload authorization letter (optional)" error={errors.authorization_letter} hint="You can also hand the printed letter in at pick-up."><input type="file" accept=".pdf,.jpg,.jpeg,.png" className={inputCls} onChange={file('authorization_letter')} /></Field>
                      <ImagePreview file={files.authorization_letter} label="letter preview" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="xl:sticky xl:top-20 xl:self-start">
          <Card title="Summary">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Document</dt><dd className="text-right font-medium">{selected?.name || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Fee per copy</dt><dd className="font-medium">{selected ? peso(selected.fee) : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Copies</dt><dd className="font-medium">{f.copies}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Payment</dt><dd className="font-medium">{f.payment_method}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Pick-up</dt><dd className="font-medium">{f.pickup_by === 'self' ? 'Myself' : 'Representative'}</dd></div>
              <div className="flex justify-between border-t pt-3 text-base"><dt className="font-semibold">Total to pay</dt><dd className="font-bold text-brand-700">{peso(total)}</dd></div>
            </dl>
            <Button type="submit" loading={busy} className="mt-5 w-full py-3">Submit request</Button>
            <p className="mt-3 text-center text-xs text-slate-500">You will receive a transaction number after submitting.</p>
          </Card>
        </div>
      </div>
    </form>
  );
}
