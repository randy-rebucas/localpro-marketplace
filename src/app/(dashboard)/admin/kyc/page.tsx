import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import PageGuide from "@/components/shared/PageGuide";
import AdminKycClient from "./AdminKycClient";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "KYC Review" };

interface UserWithKyc {
  _id: { toString(): string };
  name: string;
  email: string;
  role: string;
  kycStatus: string;
  kycDocuments: { type: string; url: string; uploadedAt: string }[];
  kycRejectionReason?: string | null;
  createdAt: string | Date;
}

export default async function AdminKycPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const [pending, reviewed] = await Promise.all([
    userRepository.findUsersByKycStatus("pending", { sort: 1 }),
    userRepository.findUsersByKycStatus(["approved", "rejected"], { sort: -1, limit: 50 }),
  ]);

  const typedPending  = pending  as unknown as UserWithKyc[];
  const typedReviewed = reviewed as unknown as UserWithKyc[];

  // Fetch certification map (provider-only)
  const providerIds = [...typedPending, ...typedReviewed]
    .filter((u) => u.role === "provider")
    .map((u) => u._id.toString());
  const certMapRaw = providerIds.length > 0
    ? await providerProfileRepository.findCertificationByUserIds(providerIds)
    : new Map<string, boolean>();

  // Serialize for client component (no MongoDB objects or Dates)
  function serialize(u: UserWithKyc) {
    return {
      id:                 u._id.toString(),
      name:               u.name,
      email:              u.email,
      role:               u.role,
      kycStatus:          u.kycStatus,
      kycDocuments:       u.kycDocuments ?? [],
      kycRejectionReason: u.kycRejectionReason ?? null,
      createdAt:          new Date(u.createdAt).toISOString(),
    };
  }

  const serializedPending  = typedPending.map(serialize);
  const serializedReviewed = typedReviewed.map(serialize);
  const certMap = Object.fromEntries(certMapRaw);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
          <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">KYC Review</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {serializedPending.length} submission{serializedPending.length !== 1 ? "s" : ""} awaiting verification
          </p>
        </div>
      </div>

      <PageGuide
        pageKey="admin-kyc"
        title="How KYC Review works"
        steps={[
          { icon: "📄", title: "Review documents",      description: "Providers upload a government-issued ID to prove their identity. Click the document link to view it." },
          { icon: "✅", title: "Approve for Verified",  description: "Approving grants the provider a Verified badge on their profile, building client trust." },
          { icon: "❌", title: "Reject with reason",    description: "If the document is unclear or invalid, reject and include a reason so the provider can resubmit." },
          { icon: "🔁", title: "Resubmission queue",    description: "Rejected providers can upload new documents — they'll reappear here for a second review." },
        ]}
      />

      <AdminKycClient
        pending={serializedPending}
        reviewed={serializedReviewed}
        certMap={certMap}
      />
    </div>
  );
}
