import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, fieldErrors, safeUrl } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import useSettings from '../../useSettings';
import { Button, Card, Empty, Field, Icon, PageHeader, Spinner, inputCls } from '../../components/ui';

const KEYS = ['about_text', 'address', 'office_hours', 'contact_phone', 'contact_email', 'gcash_name', 'gcash_number',
  'bank_name', 'bank_account_name', 'bank_account_number', 'payment_notes', 'claim_steps'];

export default function SiteSettings() {
  const toast = useToast();
  const confirm = useConfirm();
  const [s, setS] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/settings').then((r) => {
      setS(r.data.data);
      setForm(Object.fromEntries(KEYS.map((k) => [k, r.data.data[k] || ''])));
    }).catch((e) => toast(errMsg(e), 'error'));
  }, []);
  if (!s || !form) return <Spinner />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErrors({});
    try { const r = await api.put('/admin/settings', form); setS(r.data.data); toast('Settings saved.'); }
    catch (err) { setErrors(fieldErrors(err)); toast(errMsg(err), 'error'); }
    finally { setBusy(false); }
  };

  const upload = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setUploading(true);
    try {
      let last;
      for (const file of picked) {
        const fd = new FormData(); fd.append('file', file);
        last = await api.post('/admin/settings/claim-files', fd);
      }
      setS(last.data.data); toast(`${picked.length} file(s) uploaded. Students can see them now.`);
    } catch (err) { toast(errMsg(err), 'error'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const removeFile = async (f) => {
    if (!(await confirm({ title: 'Remove this file?', message: f.name, danger: true, confirmText: 'Remove' }))) return;
    try { const r = await api.delete(`/admin/settings/claim-files/${f.index}`); setS(r.data.data); toast('File removed.'); }
    catch (err) { toast(errMsg(err), 'error'); }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <PageHeader title="Site settings" subtitle="Everything students see on the About page, the payment screen and the “How to claim” page."
        actions={<Button type="submit" loading={busy}>Save all changes</Button>} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Claim process (step by step)" subtitle="Shown to students under “How to claim”" className="xl:row-span-2">
          <div className="space-y-4">
            <Field label="Steps — one step per line" error={errors.claim_steps}>
              <textarea rows="9" className={inputCls} value={form.claim_steps} onChange={set('claim_steps')} />
            </Field>

            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Upload guide (image or PDF)</div>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 hover:border-brand-600 hover:bg-brand-50">
                <Icon name="upload" size={26} />
                <span>{uploading ? 'Uploading…' : 'Click to choose files (JPG, PNG, WEBP or PDF · max 10MB each)'}</span>
                <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={upload} disabled={uploading} />
              </label>
            </div>

            {s.claim_files.length === 0 ? <Empty icon="file">No guide uploaded yet.</Empty> : (
              <ul className="space-y-2">
                {s.claim_files.map((f) => (
                  <li key={f.index} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
                    {f.is_image ? <img src={safeUrl(f.url)} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-lg bg-red-100 text-xs font-bold text-red-700">PDF</span>}
                    <a href={safeUrl(f.url)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 hover:underline">{f.name}</a>
                    <button type="button" onClick={() => removeFile(f)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Remove"><Icon name="trash" size={17} /></button>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/how-to-claim" className="inline-block text-sm font-medium text-brand-700 underline">Preview as students see it →</Link>
          </div>
        </Card>

        <Card title="Payment accounts" subtitle="Shown to students when they pick GCash or Bank Transfer">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GCash account name" error={errors.gcash_name}><input className={inputCls} value={form.gcash_name} onChange={set('gcash_name')} /></Field>
            <Field label="GCash number" error={errors.gcash_number}><input className={inputCls} value={form.gcash_number} onChange={set('gcash_number')} /></Field>
            <Field label="Bank name" error={errors.bank_name}><input className={inputCls} value={form.bank_name} onChange={set('bank_name')} /></Field>
            <Field label="Bank account name" error={errors.bank_account_name}><input className={inputCls} value={form.bank_account_name} onChange={set('bank_account_name')} /></Field>
            <div className="sm:col-span-2"><Field label="Bank account number" error={errors.bank_account_number}><input className={inputCls} value={form.bank_account_number} onChange={set('bank_account_number')} /></Field></div>
            <div className="sm:col-span-2"><Field label="Payment note for students" error={errors.payment_notes}><textarea rows="2" className={inputCls} value={form.payment_notes} onChange={set('payment_notes')} /></Field></div>
          </div>
        </Card>

        <Card title="About ACC & contact" subtitle="Shown on the login page and the About page">
          <div className="space-y-4">
            <Field label="About Abuyog Community College" error={errors.about_text}><textarea rows="5" className={inputCls} value={form.about_text} onChange={set('about_text')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address" error={errors.address}><input className={inputCls} value={form.address} onChange={set('address')} /></Field>
              <Field label="Office hours" error={errors.office_hours}><input className={inputCls} value={form.office_hours} onChange={set('office_hours')} /></Field>
              <Field label="Contact phone" error={errors.contact_phone}><input className={inputCls} value={form.contact_phone} onChange={set('contact_phone')} /></Field>
              <Field label="Contact email" error={errors.contact_email}><input className={inputCls} value={form.contact_email} onChange={set('contact_email')} /></Field>
            </div>
          </div>
        </Card>
      </div>
    </form>
  );
}
