import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { providerProfileService } from "@/services";
import { PublicProfileSkeleton } from "./_components/skeletons";
import PublicProfileContent from "./_components/PublicProfileContent";
import { ShareButtons } from "@/app/jobs/[id]/ShareButtons";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

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

  // Fetch profile for server-side structured data
  let providerName = "Provider";
  let providerBio = "";
  let providerSkills: string[] = [];
  let providerCity = "Philippines";
  try {
    const profile = await providerProfileService.getProfile(id);
    const userInfo = profile?.userId as { name?: string } | string | null | undefined;
    providerName = typeof userInfo === "object" && userInfo !== null ? (userInfo.name ?? "Provider") : "Provider";
    providerBio = (profile as { bio?: string })?.bio ?? "";
    providerSkills = (profile as { skills?: string[] })?.skills ?? [];
    const areas = (profile as { serviceAreas?: { address?: string }[] })?.serviceAreas;
    providerCity = areas?.[0]?.address ?? "Philippines";
  } catch { /* non-critical */ }

  const pageUrl = `${APP_URL}/providers/${id}`;
  const shareText = `🔧 Check out ${providerName} on LocalPro — hire trusted local service professionals!`;

  // LocalBusiness / Person JSON-LD for Google rich results
  const providerSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: providerName,
    description: providerBio || `Hire ${providerName} on LocalPro`,
    url: pageUrl,
    ...(providerSkills.length > 0 && { knowsAbout: providerSkills }),
    areaServed: {
      "@type": "Place",
      name: providerCity,
    },
    serviceType: providerSkills[0] ?? "Local Service Professional",
    provider: {
      "@type": "Organization",
      name: "LocalPro",
      url: APP_URL,
    },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(providerSchema) }}
      />
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

      {/* Share strip */}
      <div className="border-t border-slate-200 bg-slate-900 py-5">
        <div className="max-w-5xl mx-auto px-4">
          <ShareButtons url={pageUrl} text={shareText} />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-0 py-6 sm:py-8">
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
