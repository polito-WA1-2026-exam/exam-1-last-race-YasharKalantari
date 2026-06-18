import { createContext, useContext, useState, useEffect } from 'react';
import API from '../API.js';

// A Context lets any component read the logged-in user (and call login/logout)
// without passing props down through every level.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);     // null = not logged in
  const [loading, setLoading] = useState(true); // true while we check the session on startup

  // On first render, ask the server who (if anyone) is logged in.
  // In Strict Mode this effect runs twice in development; that is harmless here
  // because it is only a read (a GET), with no side effects to undo.
  useEffect(() => {
    API.getCurrentUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (credentials) => {
    const u = await API.login(credentials);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await API.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Small helper so components just call useAuth() instead of useContext(AuthContext).
export function useAuth() {
  return useContext(AuthContext);
}
