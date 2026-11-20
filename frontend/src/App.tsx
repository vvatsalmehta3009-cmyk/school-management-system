import React, { useState, useEffect } from "react";
import { api } from "./api/client";
import type { UserProfile } from "./types";
import { Header } from "./components/Header";
import { AppGrid } from "./components/AppGrid";
import { AcademicApp, type AcademicSidebarTab } from "./components/AcademicApp";
import { UsersApp } from "./components/UsersApp";
import { LoginView } from "./components/LoginView";
import { OnboardingModal } from "./components/OnboardingModal";
import { ChangePasswordModal } from "./components/ChangePasswordModal";

export const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [schoolName, setSchoolName] = useState<string>("");
  const [activeApp, setActiveApp] = useState<string>("grid");
  const [academicTab, setAcademicTab] = useState<AcademicSidebarTab>("sections-tree");
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Auto-authenticate on load if token is stored in localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          setSchoolName(profile.school_name || profile.school_code);
        } catch {
          api.clearToken();
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLoginSuccess = (profile: UserProfile, name: string) => {
    setUser(profile);
    setSchoolName(name || profile.school_name || profile.school_code);
    setActiveApp("grid");
  };

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
    setSchoolName("");
    setActiveApp("grid");
  };

  const handleOpenApp = (appId: string) => {
    if (appId === "subjects") {
      setAcademicTab("subjects");
      setActiveApp("academic");
    } else {
      if (appId === "academic") {
        setAcademicTab("sections-tree");
      }
      setActiveApp(appId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">
        Initializing School Management Portal...
      </div>
    );
  }

  // Not logged in -> Show Login View
  if (!user) {
    return (
      <>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onOpenOnboarding={() => setShowOnboardModal(true)}
        />
        <OnboardingModal
          isOpen={showOnboardModal}
          onClose={() => setShowOnboardModal(false)}
          onSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  // Logged in -> Portal Command Center
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header
        user={user}
        schoolName={schoolName}
        onLogout={handleLogout}
        onSchoolChange={(newProfile, newName) => {
          setUser(newProfile);
          setSchoolName(newName || newProfile.school_code);
          setActiveApp("grid");
        }}
      />

      <main className="flex-1">
        {activeApp === "grid" && (
          <AppGrid
            user={user}
            onOpenApp={handleOpenApp}
            onOpenOnboardModal={() => setShowOnboardModal(true)}
          />
        )}

        {activeApp === "academic" && (
          <AcademicApp
            user={user}
            initialTab={academicTab}
            onBack={() => setActiveApp("grid")}
          />
        )}

        {activeApp === "users" && (
          <UsersApp
            user={user}
            onBack={() => setActiveApp("grid")}
          />
        )}
      </main>

      <OnboardingModal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        onSuccess={handleLoginSuccess}
      />

      <ChangePasswordModal
        isOpen={Boolean(user?.must_change_password)}
        onSuccess={() => {
          setUser((prev) => (prev ? { ...prev, must_change_password: false } : null));
        }}
      />
    </div>
  );
};

export default App;
