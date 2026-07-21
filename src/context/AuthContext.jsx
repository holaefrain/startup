import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

async function fetchUser() {
  const response = await fetch("/api/user/me");
  return response.ok ? response.json() : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Runs once on load so a page refresh (or a direct visit to a protected
  // route) picks up an existing session cookie instead of always starting
  // logged out.
  useEffect(() => {
    fetchUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  // Re-fetches the full profile from GET /api/user/me and refreshes the cached copy - used both right after a successful login/signup (as `login`) and after a profile edit in Profile.jsx (as `refreshUser`), so `user` never goes stale without a page reload.
  async function refreshUser() {
    const data = await fetchUser();
    setUser(data);
    return data;
  }

  function logout() {
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login: refreshUser, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
