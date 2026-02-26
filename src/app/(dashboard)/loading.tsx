import { PageLoader } from "@/components/ui/Spinner";

export default function DashboardLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <PageLoader />
    </div>
  );
}
