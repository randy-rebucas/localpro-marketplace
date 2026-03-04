import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ConsultationDetail } from "../_components/ConsultationDetail";

export const metadata: Metadata = { title: "Consultation Details" };

interface ConsultationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsultationDetailPage({
  params,
}: ConsultationPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto">
      <Suspense fallback={<div className="animate-pulse space-y-6"><div className="h-4 w-36 bg-slate-200 rounded" /><div className="h-64 bg-slate-200 rounded-lg" /></div>}>
        <ConsultationDetail consultationId={id} userId={user.userId} />
      </Suspense>
    </div>
  );
}
