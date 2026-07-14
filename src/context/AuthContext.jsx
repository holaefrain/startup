import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Runs once on load so a page refresh (or a direct visit to a protected
  // route) picks up an existing session cookie instead of always starting
  // logged out.
  useEffect(() => {
    fetch("/api/user/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setUser(data))
      .finally(() => setLoading(false));
  }, []);

  function login(email) {
    setUser({ email });
  }

  function logout() {
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
