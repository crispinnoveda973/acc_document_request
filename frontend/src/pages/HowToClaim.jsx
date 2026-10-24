import { Link } from 'react-router-dom';
import useSettings from '../useSettings';
import { safeUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { Card, Empty, Icon, Notice, PageHeader, Spinner } from '../components/ui';

export default function HowToClaim() {
  const { user } = useAuth();
  const [s] = useSettings();
  if (!s) return <Spinner />;

  const steps = (s.claim_steps || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const files = s.claim_files || [];
  const isAdmin = user.role === 'admin';

  return (
    <div className="space-y-6">
      <PageHeader title="How to claim your documents" subtitle="Follow these steps set by the college office."
        actions={isAdmin && <Link to="/settings" className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">Edit / upload process</Link>} />

      <div className="grid gap-6 xl:grid-cols-5">
        <Card title="Step-by-step process" className="xl:col-span-2">
          {steps.length === 0 ? <Empty icon="steps">The admin has not posted the claiming steps yet.</Empty> : (
            <ol className="space-y-5">
              {steps.map((t, i) => (
                <li key={i} className="flex gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">{i + 1}</span>
                  <p className="pt-1.5 text-sm leading-relaxed text-slate-700">{t}</p>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-6">
            <Notice tone="warn" title="Not claiming it yourself?">
              The person who will pick up your document must bring an <b>authorization letter</b> signed by you.
            </Notice>
          </div>
          {s.office_hours && <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Icon name="clock" size={16} />Office hours: {s.office_hours}</p>}
        </Card>

        <Card title="Uploaded guide" subtitle="Posted by the admin" className="xl:col-span-3">
          {files.length === 0 ? <Empty icon="upload">No guide has been uploaded yet.</Empty> : (
            <div className="space-y-5">
              {files.map((f) => (
                <figure key={f.index} className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                  {f.is_image
                    ? <a href={safeUrl(f.url)} target="_blank" rel="noopener noreferrer"><img src={safeUrl(f.url)} alt={f.name} className="w-full" /></a>
                    : <iframe src={safeUrl(f.url)} title={f.name} className="h-[70vh] w-full bg-slate-50" />}
                  <figcaption className="flex items-center justify-between gap-2 bg-slate-50 px-4 py-2 text-xs text-slate-600">
                    <span className="truncate">{f.name}</span>
                    <a href={safeUrl(f.url)} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">Open / download</a>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
