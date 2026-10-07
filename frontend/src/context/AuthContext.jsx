import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('acc_token'));

  useEffect(() => {
    if (!localStorage.getItem('acc_token')) return;
    api.get('/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem('acc_token'))
      .finally(() => setLoading(false));
  }, []);

  const accept = (data) => {
    localStorage.setItem('acc_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (login, password) => accept((await api.post('/login', { login, password })).data);
  const register = async (payload) => accept((await api.post('/register', payload)).data);
  const logout = async () => {
    try { await api.post('/logout'); } catch { /* token may already be invalid */ }
    localStorage.removeItem('acc_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
