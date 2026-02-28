"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { PageLoader } from "@/components/ui/Spinner";
import type { UserRole } from "@/types";

interface DashboardShellProps {
  children: React.ReactNode;
  role: UserRole;
  pageTitle?: string;
}

export default function DashboardShell({ children, role, pageTitle }: DashboardShellProps) {
  const router = useRouter();
  const { user, isLoading, initialized, fetchMe } = useAuthStore();

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
      <div className="h-screen flex items-center justify-center bg-surface">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={pageTitle} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
