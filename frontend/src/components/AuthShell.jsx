import { useEffect, useState } from 'react';
import api from '../api';
import { Icon, Logo } from './ui';

/** Split-screen layout for Login / Register: About ACC on the left, form on the right. */
export default function AuthShell({ children }) {
  const [info, setInfo] = useState({});
  useEffect(() => { api.get('/info').then((r) => setInfo(r.data.data)).catch(() => {}); }, []);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-black p-12 text-white lg:flex xl:p-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold-500/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-4">
          <Logo size={64} />
          <div>
            <div className="text-xl font-extrabold leading-tight">Abuyog Community College</div>
            <div className="text-sm text-gold-400">Student Document Request System</div>
          </div>
        </div>

        <div className="relative max-w-xl space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight xl:text-5xl">Request your school documents <span className="text-gold-400">online.</span></h2>
          <p className="text-base leading-relaxed text-white/80">{info.about_text}</p>
          <ul className="grid gap-3 text-sm text-white/90 sm:grid-cols-2">
            {['Request anytime, from anywhere', 'Pay with GCash or bank transfer', 'Track every step with a transaction number', 'Get notified when it is ready for pick-up'].map((t) => (
              <li key={t} className="flex items-start gap-2"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-gold-400" />{t}</li>
            ))}
          </ul>
        </div>

        <div className="relative space-y-1.5 text-sm text-white/75">
          {info.address && <p className="flex items-center gap-2"><Icon name="pin" size={16} />{info.address}</p>}
          {info.office_hours && <p className="flex items-center gap-2"><Icon name="clock" size={16} />{info.office_hours}</p>}
          {info.contact_phone && <p className="flex items-center gap-2"><Icon name="phone" size={16} />{info.contact_phone}</p>}
          {info.contact_email && <p className="flex items-center gap-2"><Icon name="mail" size={16} />{info.contact_email}</p>}
        </div>
      </section>

      <section className="flex flex-col justify-center bg-slate-50 px-5 py-10 sm:px-10">
        <div className="mx-auto mb-6 flex items-center gap-3 lg:hidden">
          <Logo size={48} className="ring-2 ring-brand-700" />
          <div className="leading-tight"><div className="font-bold text-brand-800">Abuyog Community College</div><div className="text-xs text-slate-500">Student Document Request System</div></div>
        </div>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}
