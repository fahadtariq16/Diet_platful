import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user: u } = await api('/auth/me');
      setUser(u || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      setUser,
      async login(email, password) {
        const { user: u } = await api('/auth/login', { method: 'POST', body: { email, password } });
        setUser(u);
        return u;
      },
      async register(name, email, password) {
        const { user: u } = await api('/auth/register', { method: 'POST', body: { name, email, password } });
        setUser(u);
        return u;
      },
      async logout() {
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
        setUser(null);
      }
    }),
    [user, loading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
