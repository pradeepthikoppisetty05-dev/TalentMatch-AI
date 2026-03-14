import { useState } from "react";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function RegisterPage({ onSwitchToLogin }) {
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const passwordTooShort = password.length > 0 && password.length < 8;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await register(name, email, password);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-100/50 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Sparkles className="text-white w-7 h-7" />
            </div>

            <div className="text-left">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                TalentMatch AI
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                Premium Talent Analytics
              </span>
            </div>
          </div>

          <p className="text-slate-500 text-sm font-medium">
            Create your account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
                Full Name
              </label>

              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  className={cn(
                    "w-full pl-11 pr-12 py-3.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all",
                    passwordTooShort
                      ? "border-red-300"
                      : "border-slate-200"
                  )}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {passwordTooShort && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">
                  Password must be at least 8 characters.
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
                Confirm Password
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Repeat your password"
                  required
                  className={cn(
                    "w-full pl-11 pr-12 py-3.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all",
                    confirmPassword.length > 0 && !passwordsMatch
                      ? "border-red-300"
                      : "border-slate-200"
                  )}
                />

                {passwordsMatch && (
                  <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                )}
              </div>

              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">
                  Passwords do not match.
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs font-medium">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={
                isLoading ||
                !name ||
                !email ||
                !password ||
                !confirmPassword ||
                !passwordsMatch
              }
              className={cn(
                "w-full py-3.5 rounded-xl font-bold text-white text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg",
                isLoading ||
                  !name ||
                  !email ||
                  !password ||
                  !confirmPassword ||
                  !passwordsMatch
                  ? "bg-slate-300 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-200 active:scale-[0.98]"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Switch to login */}
          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <button
              onClick={onSwitchToLogin}
              className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}