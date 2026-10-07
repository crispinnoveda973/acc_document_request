import { useEffect, useState } from 'react';
import api, { errMsg, fieldErrors } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Button, Card, Field, Spinner, inputCls } from '../../components/ui';

const EMPTY = { name: '', email: '', password: '', is_active: true };

export default function StaffAccounts() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/admin/staff').then((r) => setItems(r.data.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErrors({});
    try {
      form.id ? await api.put(`/admin/staff/${form.id}`, form) : await api.post('/admin/staff', form);
      toast('Staff account saved.'); setForm(null); load();
    } catch (err) { setErrors(fieldErrors(err)); toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };

  const remove = async (s) => {
    if (!confirm(`Delete staff account for ${s.name}?`)) return;
    try { await api.delete(`/admin/staff/${s.id}`); toast('Staff account deleted.'); load(); } catch (err) { toast(errMsg(err), 'error'); }
  };

  if (!items) return <Spinner />;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">Staff Accounts</h1><Button onClick={() => { setErrors({}); setForm({ ...EMPTY }); }}>+ Add staff</Button></div>

      {form && (
        <Card title={form.id ? 'Edit staff' : 'New staff'}>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" error={errors.name}><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Email" error={errors.email}><input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
            <Field label={form.id ? 'New password (leave blank to keep)' : 'Password (min 8)'} error={errors.password}>
              <input type="password" className={inputCls} value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!form.id} />
            </Field>
            {form.id && <Field label="Status"><select className={inputCls} value={form.is_active ? '1' : '0'} onChange={(e) => setForm({ ...form, is_active: e.target.value === '1' })}><option value="1">Active</option><option value="0">Deactivated</option></select></Field>}
            <div className="flex gap-2 sm:col-span-2"><Button type="submit" loading={busy}>Save</Button><Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button></div>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2">Name</th><th>Email</th><th>Status</th><th /></tr></thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{s.name}</td><td>{s.email}</td>
                  <td>{s.is_active ? <span className="text-green-700">Active</span> : <span className="text-slate-500">Deactivated</span>}</td>
                  <td className="space-x-3 whitespace-nowrap text-right">
                    <button className="text-brand-700 underline" onClick={() => { setErrors({}); setForm({ ...s, password: '' }); }}>Edit</button>
                    <button className="text-red-600 underline" onClick={() => remove(s)}>Delete</button>
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
