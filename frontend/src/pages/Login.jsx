import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errMsg, fieldErrors } from '../api';
import AuthShell from '../components/AuthShell';
import { Button, Field, inputCls } from '../components/ui';

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [form, setForm] = useState({ login: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try { await login(form.login, form.password); nav('/'); }
    catch (err) {
      setErrors(fieldErrors(err));
      toast(err.response?.status === 429 ? 'Too many attempts. Please wait a minute.' : errMsg(err), 'error');
    } finally { setBusy(false); }
  };

  return (
    <AuthShell>
      <form onSubmit={submit} className="space-y-5 rounded-2xl bg-white p-7 shadow-xl ring-1 ring-slate-200 sm:p-9">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500">Log in to request and track your documents.</p>
        </div>
        <Field label="Email or Student ID" error={errors.login}>
          <input className={inputCls} value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required autoFocus />
        </Field>
        <Field label="Password" error={errors.password}>
          <input type="password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </Field>
        <Button type="submit" loading={busy} className="w-full py-3">Log in</Button>
        <p className="text-center text-sm text-slate-600">New student? <Link to="/register" className="font-semibold text-brand-700 underline">Create an account</Link></p>
      </form>
    </AuthShell>
  );
}
