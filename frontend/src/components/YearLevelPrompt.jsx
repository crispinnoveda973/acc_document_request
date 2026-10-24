import { useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Modal } from './ui';

/**
 * Yearly question for students (school year 2026-2027 and every school year after):
 * "Are you now a 4th year level?"  Yes -> year level moves up; No -> stays the same.
 * It has to be answered, so the dialog cannot be dismissed. The API decides when it is due (user.year_level_prompt).
 */
export default function YearLevelPrompt() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const p = user?.year_level_prompt;
  if (!p) return null;

  const answer = async (a) => {
    setBusy(a);
    try {
      const r = await api.post('/student/year-level', { answer: a });
      setUser(r.data.user);
      toast(a === 'yes' ? `Your year level is now ${p.next_year_level}.` : `Okay, your year level stays ${p.current_year_level}.`);
    } catch (e) { toast(errMsg(e), 'error'); }
    finally { setBusy(null); }
  };

  return (
    <Modal open dismissible={false} onClose={() => {}} title={`School year ${p.school_year.replace('-', '–')}`}
      footer={<>
        <Button variant="secondary" loading={busy === 'no'} disabled={!!busy} onClick={() => answer('no')}>No</Button>
        <Button loading={busy === 'yes'} disabled={!!busy} onClick={() => answer('yes')}>Yes</Button>
      </>}>
      <p className="text-base font-semibold text-slate-900">{p.question}</p>
      <p className="mt-2 text-sm">Your current year level is <b>{p.current_year_level}</b>. Choose <b>Yes</b> to update it to <b>{p.next_year_level}</b>, or <b>No</b> to keep it as it is.</p>
    </Modal>
  );
}
