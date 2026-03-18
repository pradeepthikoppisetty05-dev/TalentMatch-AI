import { lazy, Suspense, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

const AnalyzerPage = lazy(() => import("./pages/analyzerPage.jsx"));
const LoginPage    = lazy(() => import("./pages/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));

function PageSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Loading...</p>
      </div>
    </div>
  );
}

function Root() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState("login");

  if (loading) return <PageSpinner />;

  if (!user) {
    return authView === "register"
      ? <RegisterPage onSwitchToLogin={() => setAuthView("login")} />
      : <LoginPage onSwitchToRegister={() => setAuthView("register")} />;
  }

  return <AnalyzerPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageSpinner />}>
        <Root />
      </Suspense>
    </AuthProvider>
  );
}
