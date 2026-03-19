import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { providerProfileService } from "@/services";
import { PublicProfileSkeleton } from "./_components/skeletons";
import PublicProfileContent from "./_components/PublicProfileContent";
import { ShareButtons } from "@/app/jobs/[id]/ShareButtons";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

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
  let providerSkills: Array<{ skill: string; yearsExperience: number; hourlyRate: string }> = [];
  let providerCity = "Philippines";
  try {
    const profile = await providerProfileService.getProfile(id);
    const userInfo = profile?.userId as { name?: string } | string | null | undefined;
    providerName = typeof userInfo === "object" && userInfo !== null ? (userInfo.name ?? "Provider") : "Provider";
    providerBio = (profile as { bio?: string })?.bio ?? "";
    providerSkills = (profile as unknown as { skills?: Array<{ skill: string; yearsExperience: number; hourlyRate: string }> })?.skills ?? [];
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
    ...(providerSkills.length > 0 && { knowsAbout: providerSkills.map((s) => s.skill) }),
    areaServed: {
      "@type": "Place",
      name: providerCity,
    },
    serviceType: providerSkills[0]?.skill ?? "Local Service Professional",
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
      {/* Header */}
      <PublicHeader />

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
      <PublicFooter />
    </div>
  );
}
