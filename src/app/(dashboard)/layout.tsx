// Dashboard route group layout — intentionally minimal.
// Each role sub-group has its own layout that renders DashboardShell.
export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
