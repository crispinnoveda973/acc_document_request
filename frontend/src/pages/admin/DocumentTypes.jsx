import { useEffect, useState } from 'react';
import api, { errMsg, fieldErrors } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Button, Card, Field, PageHeader, Spinner, inputCls } from '../../components/ui';

const EMPTY = { name: '', description: '', fee: 0, processing_days: 3, is_active: true };

export default function DocumentTypes() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/document-types', { params: { all: 1 } }).then((r) => setItems(r.data.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErrors({});
    try {
      form.id ? await api.put(`/admin/document-types/${form.id}`, form) : await api.post('/admin/document-types', form);
      toast('Document type saved.'); setForm(null); load();
    } catch (err) { setErrors(fieldErrors(err)); toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };

  const remove = async (t) => {
    if (!(await confirm({ title: 'Delete document type?', message: `"${t.name}" will be deleted (or deactivated if it already has requests).`, danger: true, confirmText: 'Delete' }))) return;
    try { const r = await api.delete(`/admin/document-types/${t.id}`); toast(r.data.message); load(); }
    catch (err) { toast(errMsg(err), 'error'); }
  };

  if (!items) return <Spinner />;
  return (
    <div className="space-y-6">
      <PageHeader title="Document types" subtitle="Documents students can request, with their fee and processing time." actions={<Button onClick={() => { setErrors({}); setForm({ ...EMPTY }); }}>+ Add type</Button>} />

      {form && (
        <Card title={form.id ? 'Edit document type' : 'New document type'}>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" error={errors.name}><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Fee (₱ per copy)" error={errors.fee}><input type="number" step="0.01" min="0" className={inputCls} value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} required /></Field>
            <Field label="Processing days" error={errors.processing_days}><input type="number" min="1" className={inputCls} value={form.processing_days} onChange={(e) => setForm({ ...form, processing_days: e.target.value })} required /></Field>
            <Field label="Status"><select className={inputCls} value={form.is_active ? '1' : '0'} onChange={(e) => setForm({ ...form, is_active: e.target.value === '1' })}><option value="1">Active</option><option value="0">Inactive</option></select></Field>
            <div className="sm:col-span-2"><Field label="Description" error={errors.description}><textarea rows="2" className={inputCls} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
            <div className="flex gap-2 sm:col-span-2"><Button type="submit" loading={busy}>Save</Button><Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button></div>
          </form>
        </Card>
      )}

      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Name</th><th>Fee</th><th>Days</th><th>Status</th><th /></tr></thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-5 py-3.5"><b>{t.name}</b><div className="text-xs text-slate-500">{t.description}</div></td>
                  <td>₱{Number(t.fee).toFixed(2)}</td><td>{t.processing_days}</td>
                  <td>{t.is_active ? <span className="text-green-700">Active</span> : <span className="text-slate-500">Inactive</span>}</td>
                  <td className="space-x-3 whitespace-nowrap pr-5 text-right">
                    <button className="text-brand-700 underline" onClick={() => { setErrors({}); setForm({ ...t }); }}>Edit</button>
                    <button className="text-red-600 underline" onClick={() => remove(t)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
