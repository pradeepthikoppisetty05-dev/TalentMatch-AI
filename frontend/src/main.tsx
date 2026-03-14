import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import App from "./App.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import "./index.css";

function Root() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState("login"); // "login" | "register"

  // Restoring session from localStorage — show nothing to avoid flash
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in — show auth pages
  if (!user) {
    if (authView === "register") {
      return <RegisterPage onSwitchToLogin={() => setAuthView("login")} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthView("register")} />;
  }

  // Logged in — show the main app
  return <App />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>
);
