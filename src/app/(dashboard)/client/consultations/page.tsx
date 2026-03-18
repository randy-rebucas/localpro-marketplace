import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import TourGuide from "@/components/shared/TourGuide";
import { ConsultationsData } from "./_components/ConsultationsData";
import { ConsultationsSkeleton } from "./_components/skeletons";

export const metadata: Metadata = { title: "Consultations" };

export default async function ClientConsultationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("clientPages");

  return (
    <div className="space-y-6">
      <TourGuide
        pageKey="client-consultations"
        title="How Consultation Requests work"
        steps={[
          { icon: "🎥", title: "Request a consultation", description: "Upload photos and describe what you need. Get professional insights before posting a full job." },
          { icon: "⏳", title: "Wait for response", description: "Providers review your photos and respond with estimates or decline." },
          { icon: "💰", title: "See estimates", description: "Review provider estimates and detailed notes about the scope of work." },
          { icon: "✅", title: "Post as a job", description: "Once accepted, easily convert the consultation into a full job posting." },
        ]}
      />
      <RealtimeRefresher entity="consultation" />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t("consultations")}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {t("consultationsSub")}
          </p>
        </div>
        <Link href="/client/consultations/request" className="btn-primary self-start sm:flex-shrink-0 sm:mt-1">
          {t("requestConsultation")}
        </Link>
      </div>

      {/* List */}
      <Suspense fallback={<ConsultationsSkeleton />}>
        <ConsultationsData userId={user.userId} />
      </Suspense>
    </div>
  );
}
