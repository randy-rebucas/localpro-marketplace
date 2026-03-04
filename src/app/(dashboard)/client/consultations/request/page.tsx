import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RequestConsultationForm } from "../_components/RequestConsultationForm";
import { loyaltyRepository } from "@/repositories";
import { getClientTier } from "@/lib/loyalty";

export const metadata: Metadata = { title: "Request Consultation" };

export default async function RequestConsultationPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "client") redirect("/login");

  const loyaltyAccount = await loyaltyRepository.findByUserId(user.userId);
  const tierInfo = getClientTier(loyaltyAccount?.lifetimePoints ?? 0);
  const hasAIAccess = tierInfo.tier === "gold" || tierInfo.tier === "platinum";

  return (
    <div className="space-y-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/client/consultations"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors"
        >
          ← Back to Consultations
        </Link>
      </div>
      <RequestConsultationForm userId={user.userId} hasAIAccess={hasAIAccess} />
    </div>
  );
}
