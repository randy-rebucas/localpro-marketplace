import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProviderConsultationDetail } from "../_components/ProviderConsultationDetail";

export const metadata: Metadata = { title: "Respond to Consultation" };

interface ProviderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProviderConsultationDetailPage({
  params,
}: ProviderDetailPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "provider") redirect("/login");

  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <ProviderConsultationDetail consultationId={id} userId={user.userId} />
      </Suspense>
    </div>
  );
}
