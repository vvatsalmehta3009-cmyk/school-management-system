import React, { useState } from "react";
import type { UserProfile } from "../types";
import {
  ShieldCheck,
  KeyRound,
  LogOut,
  ChevronDown,
  School,
} from "lucide-react";

interface HeaderProps {
  user: UserProfile;
  schoolName: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  schoolName,
  onLogout,
}) => {
  const [showPermissions, setShowPermissions] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Active School */}
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-base">
                {schoolName || user.school_code}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {user.school_code}
              </span>
            </div>
            <p className="text-xs text-slate-500">School ID #{user.school_id} · Tenant Portal</p>
          </div>
        </div>

        {/* Right: User Profile, Role, & Scopes */}
        <div className="flex items-center space-x-3">
          {/* Role Badge */}
          <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{user.roles.join(", ") || "User"}</span>
          </div>

          {/* Permissions Scope Popover Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowPermissions(!showPermissions)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>{user.permissions.length} Scopes</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showPermissions && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-slate-900 text-sm">Active Scoped Permissions</span>
                  </div>
                  <span className="text-xs text-slate-400">{user.permissions.length} active</span>
                </div>
                <div className="max-h-60 overflow-y-auto flex flex-wrap gap-1.5 pt-1">
                  {user.permissions.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded-md text-xs font-mono bg-slate-50 text-slate-700 border border-slate-200"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            title="Sign out of school portal"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors text-xs font-medium cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
