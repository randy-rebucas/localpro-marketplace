import { PageLoader } from "@/components/ui/Spinner";

export default function ProviderLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <PageLoader />
    </div>
  );
}
