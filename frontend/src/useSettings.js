import { useEffect, useState } from 'react';
import api from './api';

/** Loads the editable site content (about, contact, payment accounts, claim steps, uploaded files). */
export default function useSettings() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/settings').then((r) => setS(r.data.data)).catch(() => setS({})); }, []);
  return [s, setS];
}
