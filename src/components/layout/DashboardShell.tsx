"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AnnouncementBanner from "@/components/shared/AnnouncementBanner";
import ImpersonationBanner from "./ImpersonationBanner";
import { PageLoader } from "@/components/ui/Spinner";
import type { UserRole } from "@/types";

interface DashboardShellProps {
  children: React.ReactNode;
  role: UserRole;
  capabilities?: string[];
  pageTitle?: string;
}

export default function DashboardShell({ children, role, capabilities, pageTitle }: DashboardShellProps) {
  const router = useRouter();
  const { user, isLoading, initialized, fetchMe } = useAuthStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check for active impersonation session (cookie readable by JS)
  const [impersonatedName, setImpersonatedName] = useState<string | null>(null);
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)impersonated_user_name=([^;]+)/);
    setImpersonatedName(match ? decodeURIComponent(match[1]) : null);
  }, []);

  // Bootstrap auth state once on mount
  useEffect(() => {
    if (!initialized && !isLoading) fetchMe();
  }, [initialized, isLoading, fetchMe]);

  // Redirect after initialization resolves with no user
  useEffect(() => {
    if (initialized && !user) router.replace("/login");
  }, [initialized, user, router]);

  // Show loader until auth is resolved and user is confirmed
  if (!initialized || isLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface dark:bg-slate-900">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface dark:bg-slate-900 overflow-hidden">
      {impersonatedName && <ImpersonationBanner userName={impersonatedName} />}
      <Sidebar role={role} capabilities={capabilities} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`flex-1 flex flex-col overflow-hidden min-w-0 ${impersonatedName ? "pt-10" : ""}`}>
        <Header title={pageTitle} onMenuClick={() => setSidebarOpen(true)} />
        <AnnouncementBanner />
        <main id="main-content" role="main" className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
