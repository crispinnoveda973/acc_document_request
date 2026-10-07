import { useState } from 'react';
import api, { errMsg, fieldErrors } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Field, PageHeader, inputCls } from '../components/ui';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const s = user.student;
  const [p, setP] = useState({ name: user.name, email: user.email, course: s?.course || '', year_level: s?.year_level || '', contact_number: s?.contact_number || '' });
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [pe, setPe] = useState({});
  const [we, setWe] = useState({});
  const [b1, setB1] = useState(false);
  const [b2, setB2] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault(); setB1(true); setPe({});
    try {
      const body = s ? p : { name: p.name, email: p.email };
      const r = await api.put('/profile', body);
      setUser(r.data.user); toast('Profile updated.');
    } catch (err) { setPe(fieldErrors(err)); toast(errMsg(err), 'error'); } finally { setB1(false); }
  };

  const savePw = async (e) => {
    e.preventDefault(); setB2(true); setWe({});
    try {
      await api.put('/password', pw);
      setPw({ current_password: '', password: '', password_confirmation: '' }); toast('Password changed.');
    } catch (err) { setWe(fieldErrors(err)); toast(errMsg(err), 'error'); } finally { setB2(false); }
  };

  return (
    <div className="space-y-6">
    <PageHeader title="My Profile" subtitle="Update your details and password." />
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Profile">
        <form onSubmit={saveProfile} className="space-y-3">
          {s && <Field label="Student ID"><input className={inputCls} value={s.student_number} disabled /></Field>}
          <Field label="Full Name" error={pe.name}><input className={inputCls} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required /></Field>
          <Field label="Email" error={pe.email}><input type="email" className={inputCls} value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} required /></Field>
          {s && <>
            <Field label="Course / Program" error={pe.course}><input className={inputCls} value={p.course} onChange={(e) => setP({ ...p, course: e.target.value })} required /></Field>
            <Field label="Year Level" error={pe.year_level}><input className={inputCls} value={p.year_level} onChange={(e) => setP({ ...p, year_level: e.target.value })} required /></Field>
            <Field label="Contact Number" error={pe.contact_number}><input className={inputCls} value={p.contact_number} onChange={(e) => setP({ ...p, contact_number: e.target.value })} required /></Field>
          </>}
          <Button type="submit" loading={b1}>Save changes</Button>
        </form>
      </Card>
      <Card title="Change Password">
        <form onSubmit={savePw} className="space-y-3">
          <Field label="Current Password" error={we.current_password}><input type="password" className={inputCls} value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} required /></Field>
          <Field label="New Password (min 8)" error={we.password}><input type="password" className={inputCls} value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} required /></Field>
          <Field label="Confirm New Password"><input type="password" className={inputCls} value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} required /></Field>
          <Button type="submit" loading={b2}>Update password</Button>
        </form>
      </Card>
    </div>
    </div>
  );
}
