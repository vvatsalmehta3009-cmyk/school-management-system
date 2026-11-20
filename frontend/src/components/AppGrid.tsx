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
  MoreHorizontal,
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

interface SectionCategory {
  id: string;
  name: string;
  tiles: AppTile[];
}

export const AppGrid: React.FC<AppGridProps> = ({
  user,
  onOpenApp,
  onOpenOnboardModal,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const categories: SectionCategory[] = [
    {
      id: "platform",
      name: "Platform & Tenant",
      tiles: [
        {
          id: "onboarding",
          title: "Onboarding",
          tagline: "Provision school tenant",
          icon: Building2,
          requiredPermission: "admin.manage",
          status: "ACTIVE",
          color: "from-slate-700 to-slate-900",
        },
      ],
    },
    {
      id: "identity",
      name: "Identity & Roles (RBAC)",
      tiles: [
        {
          id: "users",
          title: "User Directory",
          tagline: "Staff & student accounts",
          icon: UserCog,
          requiredPermission: "admin.manage",
          status: "ACTIVE",
          color: "from-indigo-600 to-violet-700",
        },
      ],
    },
    {
      id: "academics",
      name: "Academics & Curriculum",
      tiles: [
        {
          id: "academic",
          title: "Academics",
          tagline: "Years, classes & sections",
          icon: CalendarDays,
          requiredPermission: "academic.view",
          status: "ACTIVE",
          color: "from-blue-600 to-indigo-600",
        },
        {
          id: "staff",
          title: "Teaching Matrix",
          tagline: "Teacher-subject mapping",
          icon: Users,
          requiredPermission: "teachers.view",
          status: "NEXT",
          color: "from-emerald-600 to-teal-600",
        },
        {
          id: "subjects",
          title: "Subjects",
          tagline: "Course & syllabus catalog",
          icon: BookOpen,
          requiredPermission: "academic.view",
          status: "PLANNED",
          color: "from-cyan-600 to-blue-600",
        },
      ],
    },
    {
      id: "operations",
      name: "Student Operations",
      tiles: [
        {
          id: "students",
          title: "Admissions",
          tagline: "Student rosters & intake",
          icon: GraduationCap,
          requiredPermission: "students.view",
          status: "PLANNED",
          color: "from-purple-600 to-violet-600",
        },
        {
          id: "attendance",
          title: "Attendance",
          tagline: "Daily roll-call & register",
          icon: ClipboardCheck,
          requiredPermission: "attendance.view",
          status: "PLANNED",
          color: "from-amber-600 to-orange-600",
        },
        {
          id: "fees",
          title: "Fee Manager",
          tagline: "Receipts & ledger dues",
          icon: CreditCard,
          requiredPermission: "fees.view",
          status: "PLANNED",
          color: "from-rose-600 to-pink-600",
        },
      ],
    },
  ];

  const hasAccess = (tile: AppTile) => {
    if (!tile.requiredPermission) return true;
    if (user.roles.includes("School Admin") || user.roles.includes("Super Admin")) return true;
    return user.permissions.includes(tile.requiredPermission);
  };

  const query = searchQuery.trim().toLowerCase();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Bar with Okta-style App Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your apps..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {user.school_code}
          </span>
          <span>·</span>
          <span>{user.roles.join(", ")}</span>
        </div>
      </div>

      {/* Sections Loop */}
      {categories.map((cat) => {
        const filteredTiles = cat.tiles.filter((t) =>
          !query ||
          t.title.toLowerCase().includes(query) ||
          t.tagline.toLowerCase().includes(query)
        );

        if (filteredTiles.length === 0) return null;

        return (
          <section key={cat.id} className="space-y-3">
            {/* Clean Section Heading */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 tracking-tight">
                {cat.name}
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {filteredTiles.length} {filteredTiles.length === 1 ? "app" : "apps"}
              </span>
            </div>

            {/* Okta-Style Square Cards Grid (6 columns desktop, 3 columns tablet, 2 columns mobile) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {filteredTiles.map((tile) => {
                const Icon = tile.icon;
                const accessible = hasAccess(tile);
                const isActive = tile.status === "ACTIVE";

                return (
                  <div
                    key={tile.id}
                    className={`group relative aspect-square rounded-2xl border transition-all duration-150 flex flex-col justify-between p-3 select-none ${
                      accessible
                        ? "bg-white border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 cursor-pointer"
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
                    {/* Top Row: Lock status on left, Ready/Next tag + Options icon on right */}
                    <div className="flex items-center justify-between w-full">
                      {!accessible ? (
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <span className="w-3.5 h-3.5" />
                      )}

                      <div className="flex items-center space-x-1">
                        {tile.status === "ACTIVE" ? (
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                            Ready
                          </span>
                        ) : tile.status === "NEXT" ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                            Next
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            Soon
                          </span>
                        )}

                        <button
                          type="button"
                          className="text-slate-300 hover:text-slate-500 p-0.5 rounded transition-colors"
                          title="More options"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Center: Large, prominent, branded logo icon */}
                    <div className="flex flex-col items-center justify-center my-auto">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${tile.color} flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-150`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Bottom: Crisp App Name & Short Tagline (Standard readable font sizes!) */}
                    <div className="text-center w-full">
                      <h3 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                        {tile.title}
                      </h3>
                      <p className="text-xs text-slate-400 truncate mt-0.5 font-normal">
                        {tile.tagline}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
