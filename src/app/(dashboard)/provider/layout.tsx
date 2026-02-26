import DashboardShell from "@/components/layout/DashboardShell";

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="provider">{children}</DashboardShell>;
}
