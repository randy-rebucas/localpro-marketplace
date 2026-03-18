import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import TourGuide from "@/components/shared/TourGuide";
import { ProviderConsultationsData } from "./_components/ProviderConsultationsData";
import { ConsultationsSkeleton } from "./_components/skeletons";

export const metadata: Metadata = { title: "Consultation Requests" };

export default async function ProviderConsultationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "provider") redirect("/login");
  const t = await getTranslations("providerPages");

  return (
    <div className="space-y-6">
      <TourGuide
        pageKey="provider-consultations"
        title="How Consultation Requests work"
        steps={[
          { icon: "📸", title: "Review photos", description: "Clients upload photos of their projects and describe what they need." },
          { icon: "💭", title: "Assess the work", description: "Review the photos, description, and location to understand the scope." },
          { icon: "💰", title: "Provide estimate", description: "Accept the request and give your professional estimate and notes." },
          { icon: "📋", title: "Convert to job", description: "If client accepts, they can convert the consultation into a full job post." },
        ]}
      />
      <RealtimeRefresher entity="consultation" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("consultations")}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {t("consultationsSub")}
        </p>
      </div>

      {/* List */}
      <Suspense fallback={<ConsultationsSkeleton />}>
        <ProviderConsultationsData userId={user.userId} />
      </Suspense>
    </div>
  );
}
