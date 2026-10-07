import { Link } from 'react-router-dom';
import useSettings from '../useSettings';
import { useAuth } from '../context/AuthContext';
import { Card, Icon, Logo, PageHeader, Spinner } from '../components/ui';

export default function About() {
  const { user } = useAuth();
  const [s] = useSettings();
  if (!s) return <Spinner />;

  const contacts = [
    ['pin', 'Address', s.address], ['clock', 'Office hours', s.office_hours],
    ['phone', 'Phone', s.contact_phone], ['mail', 'Email', s.contact_email],
  ].filter(([, , v]) => v);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 p-8 text-white shadow-lg sm:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gold-500/15" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <Logo size={96} />
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-gold-400">About us</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Abuyog Community College</h1>
            <p className="mt-3 text-base leading-relaxed text-white/85">{s.about_text}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Contact & office hours" className="lg:col-span-1"
          actions={user.role === 'admin' && <Link to="/settings" className="text-sm font-medium text-brand-700 underline">Edit</Link>}>
          {contacts.length === 0 ? <p className="text-sm text-slate-500">No contact details yet.</p> : (
            <ul className="space-y-4">
              {contacts.map(([icon, label, v]) => (
                <li key={label} className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700"><Icon name={icon} size={18} /></span>
                  <div><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className="text-sm font-medium text-slate-900">{v}</div></div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="How this system works" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['file', 'Request', 'Choose the document, copies and purpose.'],
              ['wallet', 'Pay', 'Pay via GCash or bank transfer and send your reference.'],
              ['clock', 'Track', 'Follow the status using your transaction number.'],
              ['check', 'Claim', 'Pick it up on the date set by the admin.'],
            ].map(([icon, t, d], i) => (
              <div key={t} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="mb-3 flex items-center gap-2 text-brand-700"><Icon name={icon} /><span className="text-xs font-bold text-slate-400">STEP {i + 1}</span></div>
                <div className="font-semibold text-slate-900">{t}</div>
                <p className="mt-1 text-sm text-slate-500">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {user.role === 'student' && <Link to="/new" className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">Make a request</Link>}
            <Link to="/how-to-claim" className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">How to claim documents</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
