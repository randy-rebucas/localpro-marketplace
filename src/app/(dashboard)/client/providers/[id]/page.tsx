import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ProfileSkeleton } from "./_components/skeletons";
import ProfileContent from "./_components/ProfileContent";

export const metadata: Metadata = {
  title: "Provider Profile | LocalPro",
};

export default async function ProviderPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-5">
      {/* Back nav */}
      <Link
        href="/client/favorites"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Favorites
      </Link>

      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent providerId={id} currentUserId={user.userId} />
      </Suspense>
    </div>
  );
}
