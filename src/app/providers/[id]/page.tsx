import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { providerProfileService } from "@/services";
import { PublicProfileSkeleton } from "./_components/skeletons";
import PublicProfileContent from "./_components/PublicProfileContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const profile = await providerProfileService.getProfile(id);
    const userInfo = profile?.userId as { name?: string; avatar?: string | null } | string | null | undefined;
    const name = typeof userInfo === "object" && userInfo !== null ? (userInfo.name ?? "Provider") : "Provider";
    const bio = (profile as { bio?: string })?.bio?.slice(0, 150) || `View ${name}\'s profile on LocalPro.`;
    const avatar = typeof userInfo === "object" && userInfo !== null ? (userInfo.avatar ?? null) : null;
    return {
      title: `${name} | LocalPro`,
      description: bio,
      openGraph: {
        title: `${name} | LocalPro`,
        description: bio,
        images: avatar ? [{ url: avatar }] : [],
      },
    };
  } catch {
    return { title: "Provider Profile | LocalPro" };
  }
}

export default async function PublicProviderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Minimal navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="text-base font-bold text-primary tracking-tight">
            LocalPro
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 sm:py-8">
        <Suspense fallback={<PublicProfileSkeleton />}>
          <PublicProfileContent providerId={id} />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-8 sm:mt-16 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-slate-400 space-y-1">
          <p>© {new Date().getFullYear()} LocalPro. All rights reserved.</p>
          <p>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            {" · "}
            <Link href="/terms" className="hover:underline">Terms</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
