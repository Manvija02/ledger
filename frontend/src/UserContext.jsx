import { createContext, useContext, useState, useEffect } from 'react';
import * as api from './api';

const UserContext = createContext(null);

// The demo still ships with these six seeded accounts (see backend/app/seed.py)
// so the "switch account" UX can stay one click, but every switch now goes
// through a real /auth/login call — this is no longer a fake state swap.
export const DEMO_ACCOUNTS = [
  { email: 'maria@example.com', password: 'password123' },
  { email: 'david@example.com', password: 'password123' },
  { email: 'jordan@firm.com', password: 'password123' },
  { email: 'sam@firm.com', password: 'password123' },
  { email: 'lee@firm.com', password: 'password123' },
  { email: 'ren@firm.com', password: 'password123' },
];

export function UserProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const [onboarded, setOnboarded] = useState({});
  const [recentsByUser, setRecentsByUser] = useState({});
  const [lastTabByReturn, setLastTabByReturn] = useState({});

  // On load, if a token is already stored (e.g. page refresh), try to
  // resume the session instead of forcing a re-login every time.
  useEffect(() => {
    const token = api.getToken();
    if (!token) { setLoading(false); return; }
    api.getMe()
      .then(setUserState)
      .catch(() => api.setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function loginAs(email, password) {
    setAuthError(null);
    try {
      const u = await api.login(email, password);
      setUserState(u);
      return u;
    } catch (e) {
      setAuthError(e.message || 'Login failed');
      throw e;
    }
  }

  function logout() {
    api.logout();
    setUserState(null);
  }

  function addRecent(item) {
    if (!user) return;
    setRecentsByUser(prev => {
      const mine = prev[user.id] || [];
      const updated = [item, ...mine.filter(r => r.label !== item.label)].slice(0, 5);
      return { ...prev, [user.id]: updated };
    });
  }

  function setLastTab(returnId, tab) {
    setLastTabByReturn(prev => (prev[returnId] === tab ? prev : { ...prev, [returnId]: tab }));
  }

  function getReturnHref(returnId) {
    const tab = lastTabByReturn[returnId] || 'overview';
    return `/returns/${returnId}/${tab}`;
  }

  const recents = user ? (recentsByUser[user.id] || []) : [];

  return (
    <UserContext.Provider value={{
      user, loading, authError, loginAs, logout,
      onboarded, setOnboarded, recents, addRecent,
      lastTabByReturn, setLastTab, getReturnHref,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
