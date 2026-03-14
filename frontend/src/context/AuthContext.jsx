import { createContext, useContext, useState, useEffect } from "react";
import { getMe, login as apiLogin, register as apiRegister, logout as apiLogout, getToken } from "../services/authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // restoring session on mount

  // Restore session from stored token on first load
  useEffect(() => {
    async function restoreSession() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const data = await getMe();
        setUser(data.user);
      } catch {
        // Token is invalid or expired — clear it silently
        apiLogout();
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  async function login(email, password) {
    const data = await apiLogin(email, password);
    setUser(data.user);
    return data;
  }

  async function register(name, email, password) {
    const data = await apiRegister(name, email, password);
    setUser(data.user);
    return data;
  }

  function logout() {
    apiLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
