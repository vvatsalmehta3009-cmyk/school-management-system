import React, { useState } from "react";
import { api } from "../api/client";
import type { UserProfile } from "../types";
import { School, LogIn, AlertCircle, Building2 } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile, schoolName: string) => void;
  onOpenOnboarding: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onOpenOnboarding,
}) => {
  const [identifier, setIdentifier] = useState("HMBS000001");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(identifier.trim(), password);
      // Fetch me
      const me = await api.getMe();
      onLoginSuccess(
        {
          ...me,
          full_name: me.full_name || res.full_name,
          school_user_code: me.school_user_code || res.school_user_code,
          must_change_password: res.must_change_password ?? me.must_change_password,
        },
        res.school_name
      );
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-indigo-600/30">
            <School className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">School Portal Login</h2>
          <p className="text-xs text-slate-500 mt-1">
            Access your school apps, academic setup & management
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address or School User Code
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. admin@school.com or HMBS000001"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Log in with your registered email address or assigned school code (e.g. HMBS000001).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? "Authenticating..." : "Sign In to School Portal"}</span>
          </button>
        </form>

        {/* Cold Start / Onboarding option */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 mb-2">Setting up a new school tenant?</p>
          <button
            onClick={onOpenOnboarding}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Onboard New School & Master Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
};
