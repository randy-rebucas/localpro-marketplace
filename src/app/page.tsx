import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function RootPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Redirect to role-specific dashboard
  const dashboardRoutes: Record<string, string> = {
    client: "/client/dashboard",
    provider: "/provider/dashboard",
    admin: "/admin/dashboard",
  };

  redirect(dashboardRoutes[user.role] ?? "/login");
}
