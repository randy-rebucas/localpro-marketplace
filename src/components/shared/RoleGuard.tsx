"use client";

import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/types";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only when the current user's role is in allowedRoles.
 * Use this for conditional UI rendering within a page (not for route protection).
 * Route protection is handled by middleware.ts.
 */
export default function RoleGuard({
  allowedRoles,
  children,
  fallback = null,
}: RoleGuardProps) {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
