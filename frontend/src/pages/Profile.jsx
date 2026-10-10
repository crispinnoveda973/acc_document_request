import { useRef, useState } from 'react';
import api, { AVATAR_MAX_MB, AVATAR_TYPES, errMsg, fieldErrors } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { Avatar, Button, Card, Field, Icon, PageHeader, inputCls } from '../components/ui';

/** Upload / change / remove the profile picture. Works for both students and admins. */
function PhotoCard({ user, setUser }) {
  const toast = useToast();
  const confirm = useConfirm();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);   // local preview shown while the upload is running

  const pick = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';   // allow choosing the same file again later
    if (!file) return;
    // Quick checks here for instant feedback; the API validates again.
    if (!AVATAR_TYPES.includes(file.type)) return toast('Please choose a JPG, PNG or WebP image.', 'error');
    if (file.size > AVATAR_MAX_MB * 1024 * 1024) return toast(`The photo must be ${AVATAR_MAX_MB} MB or smaller.`, 'error');

    const url = URL.createObjectURL(file);
    setPreview(url); setBusy(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const r = await api.post('/profile/photo', fd);
      setUser(r.data.user);   // sidebar picture updates immediately
      toast('Profile picture updated.');
    } catch (err) { toast(errMsg(err), 'error'); }
    finally { setBusy(false); setPreview(null); URL.revokeObjectURL(url); }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Remove profile picture?', message: 'Your initial will be shown instead.', danger: true, confirmText: 'Remove', cancelText: 'Keep' }))) return;
    setBusy(true);
    try { const r = await api.delete('/profile/photo'); setUser(r.data.user); toast('Profile picture removed.'); }
    catch (err) { toast(errMsg(err), 'error'); }
    finally { setBusy(false); }
  };

  return (
    <Card title="Profile picture" subtitle={`JPG, PNG or WebP · up to ${AVATAR_MAX_MB} MB`}>
      <div className="flex flex-wrap items-center gap-5">
        <Avatar user={{ ...user, avatar_url: preview || user.avatar_url }} size={112} className={`ring-4 ring-brand-100 ${busy ? 'opacity-60' : ''}`} />
        <div className="space-y-2">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
          <div className="flex flex-wrap gap-2">
            <Button loading={busy} onClick={() => input.current?.click()}><Icon name="camera" size={16} />{user.avatar_url ? 'Change photo' : 'Upload photo'}</Button>
            {user.avatar_url && <Button variant="dangerOutline" disabled={busy} onClick={remove}>Remove</Button>}
          </div>
          <p className="text-xs text-slate-500">{user.role === 'admin' ? 'Students see this photo next to your status updates.' : 'Admins can see this photo when they process your requests.'}</p>
        </div>
      </div>
    </Card>
  );
}

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
    <PageHeader title="My Profile" subtitle="Update your picture, details and password." />
    <div className="grid gap-6 lg:grid-cols-2">
      <PhotoCard user={user} setUser={setUser} />
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
