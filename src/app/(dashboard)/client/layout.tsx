import DashboardShell from "@/components/layout/DashboardShell";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="client">{children}</DashboardShell>;
}
