import React, { useState } from "react";
import type { UserProfile } from "../types";
import {
  CalendarDays,
  Users,
  GraduationCap,
  ClipboardCheck,
  CreditCard,
  Building2,
  Lock,
  UserCog,
  BookOpen,
  Search,
  ArrowRight,
} from "lucide-react";

interface AppGridProps {
  user: UserProfile;
  onOpenApp: (appId: string) => void;
  onOpenOnboardModal: () => void;
}

interface AppTile {
  id: string;
  title: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission?: string;
  status: "ACTIVE" | "NEXT" | "PLANNED";
  color: string;
}

export const AppGrid: React.FC<AppGridProps> = ({
  user,
  onOpenApp,
  onOpenOnboardModal,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const allApps: AppTile[] = [
    {
      id: "onboarding",
      title: "School Onboarding",
      tagline: "Provision new school tenant & master admin account",
      icon: Building2,
      requiredPermission: "admin.manage",
      status: "ACTIVE",
      color: "from-slate-700 to-slate-900",
    },
    {
      id: "users",
      title: "User Directory",
      tagline: "Staff & student accounts, bulk CSV upload & role assignments",
      icon: UserCog,
      requiredPermission: "admin.manage",
      status: "ACTIVE",
      color: "from-indigo-600 to-violet-700",
    },
    {
      id: "academic",
      title: "Academic Structure",
      tagline: "Academic years, grade level classes & cohort sections",
      icon: CalendarDays,
      requiredPermission: "academic.view",
      status: "ACTIVE",
      color: "from-blue-600 to-indigo-600",
    },
    {
      id: "staff",
      title: "Teaching Matrix",
      tagline: "Teacher-subject allocation & class teacher mapping",
      icon: Users,
      requiredPermission: "teachers.view",
      status: "NEXT",
      color: "from-emerald-600 to-teal-700",
    },
    {
      id: "subjects",
      title: "Subject Catalog",
      tagline: "Master curriculum subjects, course codes & syllabus",
      icon: BookOpen,
      requiredPermission: "academic.view",
      status: "PLANNED",
      color: "from-cyan-600 to-blue-600",
    },
    {
      id: "students",
      title: "Student Admissions",
      tagline: "Permanent student intake profiles & annual enrollment",
      icon: GraduationCap,
      requiredPermission: "students.view",
      status: "PLANNED",
      color: "from-purple-600 to-violet-700",
    },
    {
      id: "attendance",
      title: "Daily Attendance",
      tagline: "Classroom roll-call by class teacher & period registers",
      icon: ClipboardCheck,
      requiredPermission: "attendance.view",
      status: "PLANNED",
      color: "from-amber-600 to-orange-600",
    },
    {
      id: "fees",
      title: "Fee Manager",
      tagline: "Fee categories, installment receipts & student dues ledger",
      icon: CreditCard,
      requiredPermission: "fees.view",
      status: "PLANNED",
      color: "from-rose-600 to-pink-700",
    },
  ];

  const hasAccess = (tile: AppTile) => {
    if (!tile.requiredPermission) return true;
    if (user.roles.includes("School Admin") || user.roles.includes("Super Admin")) return true;
    return user.permissions.includes(tile.requiredPermission);
  };

  const query = searchQuery.trim().toLowerCase();

  const filteredApps = allApps.filter(
    (t) =>
      !query ||
      t.title.toLowerCase().includes(query) ||
      t.tagline.toLowerCase().includes(query)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar: Search + Overview Count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search school apps..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center space-x-3 text-sm text-slate-500">
          <span className="font-semibold text-slate-800">
            {filteredApps.length} {filteredApps.length === 1 ? "App Available" : "Apps Available"}
          </span>
          <span>·</span>
          <span className="font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            {user.school_code}
          </span>
        </div>
      </div>

      {/* Unified App Grid (No Categories, Clean 4-Column Balanced Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredApps.map((tile) => {
          const Icon = tile.icon;
          const accessible = hasAccess(tile);
          const isActive = tile.status === "ACTIVE";

          return (
            <div
              key={tile.id}
              className={`group relative rounded-2xl border transition-all duration-200 flex flex-col justify-between p-6 select-none min-h-[220px] ${
                accessible
                  ? "bg-white border-slate-200/90 shadow-sm hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 cursor-pointer"
                  : "bg-slate-50/70 border-slate-200/60 opacity-60 cursor-not-allowed"
              }`}
              onClick={() => {
                if (!accessible) return;
                if (tile.id === "onboarding") {
                  onOpenOnboardModal();
                } else if (isActive) {
                  onOpenApp(tile.id);
                }
              }}
            >
              {/* Top Row: Status badge on left, Lock/Arrow on right */}
              <div className="flex items-center justify-between w-full mb-4">
                {tile.status === "ACTIVE" ? (
                  <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                    Ready
                  </span>
                ) : tile.status === "NEXT" ? (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80">
                    Up Next
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
                    Coming Soon
                  </span>
                )}

                {!accessible ? (
                  <span className="inline-flex items-center text-xs text-slate-400 font-medium">
                    <Lock className="w-3.5 h-3.5 mr-1" /> Locked
                  </span>
                ) : (
                  <div className="text-slate-300 group-hover:text-indigo-600 transition-colors">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </div>

              {/* Middle: Prominent Icon + Larger Readable Title & Description */}
              <div className="flex flex-col items-start space-y-3.5 my-1">
                <div
                  className={`w-13 h-13 rounded-2xl bg-gradient-to-tr ${tile.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0`}
                >
                  <Icon className="w-6.5 h-6.5" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">
                    {tile.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    {tile.tagline}
                  </p>
                </div>
              </div>

              {/* Bottom: Action trigger & scope */}
              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">
                  {tile.requiredPermission || "Public"}
                </span>

                {accessible && isActive ? (
                  <span className="font-semibold text-indigo-600 group-hover:underline flex items-center">
                    Launch App →
                  </span>
                ) : (
                  <span className="text-slate-400">Not Available</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
