import React, { useState, useEffect } from "react";
import type { UserProfile, PlatformSchool } from "../types";
import { api } from "../api/client";
import {
  ShieldCheck,
  KeyRound,
  LogOut,
  ChevronDown,
  School,
  Check,
  Search,
  Loader2,
  Crown,
} from "lucide-react";

interface HeaderProps {
  user: UserProfile;
  schoolName: string;
  onLogout: () => void;
  onSchoolChange?: (newProfile: UserProfile, newSchoolName: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  schoolName,
  onLogout,
  onSchoolChange,
}) => {
  const [showPermissions, setShowPermissions] = useState(false);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [searchSchool, setSearchSchool] = useState("");
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Load platform schools when Code Admin opens dropdown
  useEffect(() => {
    if (showSchoolDropdown && user.is_super_admin && schools.length === 0) {
      setLoadingSchools(true);
      api
        .getPlatformSchools()
        .then((res) => setSchools(res))
        .catch(() => {})
        .finally(() => setLoadingSchools(false));
    }
  }, [showSchoolDropdown, user.is_super_admin, schools.length]);

  const handleSelectSchool = async (targetSchool: PlatformSchool) => {
    if (targetSchool.id === user.school_id || switching) return;
    setSwitching(true);
    try {
      const res = await api.enterSchool(targetSchool.id);
      setShowSchoolDropdown(false);
      if (onSchoolChange) {
        onSchoolChange(
          {
            user_id: res.user_id,
            membership_id: res.school_membership_id,
            school_id: res.school_id,
            school_code: res.school_code,
            roles: res.roles,
            permissions: res.permissions,
            is_super_admin: res.is_super_admin,
          },
          res.school_name
        );
      }
    } catch (err: any) {
      alert(err?.message || "Failed to switch school context.");
    } finally {
      setSwitching(false);
    }
  };

  const filteredSchools = schools.filter(
    (s) =>
      !searchSchool ||
      s.name.toLowerCase().includes(searchSchool.toLowerCase()) ||
      s.code.toLowerCase().includes(searchSchool.toLowerCase())
  );

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Active School */}
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <School className="w-5 h-5" />
          </div>

          <div className="relative">
            {/* If Code Admin -> Interactive Switcher Dropdown */}
            {user.is_super_admin ? (
              <div>
                <button
                  type="button"
                  onClick={() => setShowSchoolDropdown(!showSchoolDropdown)}
                  className="flex items-center space-x-2 py-1 px-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left cursor-pointer group"
                >
                  <span className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-indigo-600 transition-colors truncate max-w-[200px] sm:max-w-xs">
                    {schoolName || user.school_code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                    {user.school_code}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                </button>

                <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                  <span className="inline-flex items-center text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    <Crown className="w-3 h-3 mr-1 text-amber-600" /> Code Admin
                  </span>
                  <span>·</span>
                  <span>Click to change school</span>
                </div>

                {/* Dropdown Menu of All Schools */}
                {showSchoolDropdown && (
                  <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-1.5">
                        <Crown className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-slate-900">
                          All Schools ({schools.length})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">Code Admin Switcher</span>
                    </div>

                    {/* Search */}
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchSchool}
                        onChange={(e) => setSearchSchool(e.target.value)}
                        placeholder="Search school name or code..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>

                    {/* School List */}
                    <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
                      {loadingSchools ? (
                        <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-600" />
                          Loading all schools...
                        </div>
                      ) : filteredSchools.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400">
                          No matching schools found.
                        </div>
                      ) : (
                        filteredSchools.map((s) => {
                          const isCurrent = s.id === user.school_id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              disabled={isCurrent || switching}
                              onClick={() => handleSelectSchool(s)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                isCurrent
                                  ? "bg-indigo-50/70 border border-indigo-200 text-indigo-900 font-semibold cursor-default"
                                  : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="truncate pr-2">
                                <div className="font-semibold text-slate-900 truncate">
                                  {s.name}
                                </div>
                                <span className="font-mono text-[10px] text-slate-400">
                                  Code: {s.code} · ID #{s.id}
                                </span>
                              </div>

                              {isCurrent ? (
                                <span className="inline-flex items-center text-[10px] font-bold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full shrink-0">
                                  <Check className="w-3 h-3 mr-1" /> Active
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 hover:text-indigo-600 shrink-0">
                                  Switch →
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Regular School Admin / Teacher / Student -> Clean Static Display */
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-sm sm:text-base">
                    {schoolName || user.school_code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {user.school_code}
                  </span>
                </div>
                <p className="text-xs text-slate-500">School ID #{user.school_id} · Tenant Portal</p>
              </div>
            )}
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
