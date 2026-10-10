import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Avatar, Button, Card, Empty, Icon, Modal, PageHeader, Spinner, inputCls } from '../../components/ui';

/** Admin: every registered student with their profile picture. Click a picture to enlarge it. */
export default function Students() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const [zoom, setZoom] = useState(null);   // student whose picture is shown enlarged

  useEffect(() => {
    setRes(null);
    const t = setTimeout(() => {   // small delay so we do not call the API on every keystroke
      api.get('/admin/students', { params: { page, ...(search && { search }) } })
        .then((r) => setRes(r.data)).catch((e) => toast(errMsg(e), 'error'));
    }, 250);
    return () => clearTimeout(t);
  }, [search, page]);

  return (
    <div className="space-y-6">
      <PageHeader title="Students" subtitle="All registered students and their profile pictures." />
      <Card>
        <input className={inputCls} placeholder="Search by name, student ID, email or course…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </Card>

      {!res ? <Spinner /> : res.data.length === 0 ? <Card><Empty icon="users">No students found.</Empty></Card> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {res.data.map((s) => (
              <div key={s.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                <button type="button" onClick={() => setZoom(s)} className="rounded-full transition hover:ring-4 hover:ring-brand-600/30" aria-label={`View ${s.name}'s picture`}>
                  <Avatar user={s} size={64} />
                </button>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="truncate font-semibold text-slate-900">{s.name}</div>
                  <div className="font-mono text-xs text-slate-500">{s.student_number}</div>
                  <div className="truncate text-xs text-slate-500">{s.course} · {s.year_level}</div>
                  <Link to={`/requests?search=${encodeURIComponent(s.student_number)}`} className="mt-1 inline-block text-xs font-semibold text-brand-700 underline">
                    {s.requests_count} request{s.requests_count === 1 ? '' : 's'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-slate-500">Page {res.meta.current_page} of {res.meta.last_page} · {res.meta.total} students</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="secondary" disabled={page >= res.meta.last_page} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}

      <Modal open={!!zoom} onClose={() => setZoom(null)} title={zoom?.name}>
        {zoom && (
          <div className="space-y-4 text-center">
            {zoom.avatar_url
              ? <img src={zoom.avatar_url} alt={zoom.name} className="mx-auto max-h-[60vh] w-full rounded-xl object-contain" />
              : <div className="grid place-items-center gap-2 py-6 text-slate-500"><Avatar user={zoom} size={96} /><p>This student has not uploaded a profile picture yet.</p></div>}
            <div className="text-left text-sm">
              <p className="flex items-center gap-2"><Icon name="user" size={15} />{zoom.student_number} · {zoom.course} · {zoom.year_level}</p>
              <p className="mt-1 flex items-center gap-2"><Icon name="mail" size={15} />{zoom.email}</p>
              <p className="mt-1 flex items-center gap-2"><Icon name="phone" size={15} />{zoom.contact_number}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
