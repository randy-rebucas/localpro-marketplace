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

export default function DashboardShell({
  children,
  role,
  pageTitle,
}: DashboardShellProps) {
  const router = useRouter();
  const { user, isLoading, initialized, fetchMe } = useAuthStore();

  useEffect(() => {
    if (!user && !isLoading && !initialized) {
      fetchMe();
    }
  }, [user, isLoading, initialized, fetchMe]);

  // Show loader while fetching or before we've resolved for the first time
  if (isLoading || !initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <PageLoader />
      </div>
    );
  }

  // After initialization, if still no user → redirect to login
  if (!user) {
    router.replace("/login");
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
