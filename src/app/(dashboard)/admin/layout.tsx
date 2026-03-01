import { getCurrentUser } from "@/lib/auth";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Pass the actual role (admin or staff) and capabilities so the shell can filter navigation
  const role = user?.role === "staff" ? "staff" : "admin";
  const capabilities = user?.capabilities ?? [];
  return <DashboardShell role={role} capabilities={capabilities}>{children}</DashboardShell>;
}
