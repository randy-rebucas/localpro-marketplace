"use client";

import { useEffect } from "react";
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

export default function DashboardShell({
  children,
  role,
  pageTitle,
}: DashboardShellProps) {
  const { user, isLoading, fetchMe } = useAuthStore();

  useEffect(() => {
    if (!user) {
      fetchMe();
    }
  }, [user, fetchMe]);

  if (isLoading || !user) {
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
