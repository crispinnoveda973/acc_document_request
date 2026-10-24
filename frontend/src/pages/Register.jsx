import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errMsg, fieldErrors } from '../api';
import AuthShell from '../components/AuthShell';
import { Button, Field, inputCls } from '../components/ui';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

export default function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({ student_number: '', name: '', email: '', course: '', year_level: YEARS[0], contact_number: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try { await register(f); toast('Account created. Welcome!'); nav('/'); }
    catch (err) { setErrors(fieldErrors(err)); toast(errMsg(err), 'error'); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell>
      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-7 shadow-xl ring-1 ring-slate-200 sm:p-9">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student registration</h1>
          <p className="text-sm text-slate-500">Create your account to request documents.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Student ID Number" error={errors.student_number}><input className={inputCls} value={f.student_number} onChange={set('student_number')} required /></Field>
          <Field label="Full Name" error={errors.name}><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
          <Field label="Email" error={errors.email}><input type="email" className={inputCls} value={f.email} onChange={set('email')} required /></Field>
          <Field label="Contact Number" error={errors.contact_number}><input className={inputCls} value={f.contact_number} onChange={set('contact_number')} required /></Field>
          <Field label="Course / Program" error={errors.course}><input className={inputCls} value={f.course} onChange={set('course')} required /></Field>
          <Field label="Year Level" error={errors.year_level}>
            <select className={inputCls} value={f.year_level} onChange={set('year_level')}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select>
          </Field>
          <Field label="Password (min 8, letters + numbers)" error={errors.password}><input type="password" className={inputCls} value={f.password} onChange={set('password')} required /></Field>
          <Field label="Confirm Password"><input type="password" className={inputCls} value={f.password_confirmation} onChange={set('password_confirmation')} required /></Field>
        </div>
        <Button type="submit" loading={busy} className="w-full py-3">Create account</Button>
        <p className="text-center text-sm">Already registered? <Link to="/login" className="font-semibold text-brand-700 underline">Log in</Link></p>
      </form>
    </AuthShell>
  );
}
