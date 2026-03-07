import DashboardShell from "@/components/layout/DashboardShell";

export default function PesoLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="peso">{children}</DashboardShell>;
}
