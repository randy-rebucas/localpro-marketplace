import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import AdminKycActions from "./AdminKycActions";
import { ShieldCheck, ShieldX, Clock, ExternalLink } from "lucide-react";

export const metadata: Metadata = { title: "KYC Review" };

interface KycDoc {
  type: string;
  url: string;
  uploadedAt: string;
}

interface ProviderWithKyc {
  _id: { toString(): string };
  name: string;
  email: string;
  kycStatus: string;
  kycDocuments: KycDoc[];
  kycRejectionReason?: string | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  pending:  { label: "Pending Review", icon: <Clock className="h-4 w-4" />, cls: "text-amber-700 bg-amber-50 border-amber-200" },
  approved: { label: "Approved",       icon: <ShieldCheck className="h-4 w-4" />, cls: "text-green-700 bg-green-50 border-green-200" },
  rejected: { label: "Rejected",       icon: <ShieldX className="h-4 w-4" />, cls: "text-red-700 bg-red-50 border-red-200" },
};

export default async function AdminKycPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectDB();

  const pending = await User.find({ role: "provider", kycStatus: "pending" })
    .select("name email kycStatus kycDocuments kycRejectionReason createdAt")
    .sort({ createdAt: 1 })
    .lean() as unknown as ProviderWithKyc[];

  const reviewed = await User.find({ role: "provider", kycStatus: { $in: ["approved", "rejected"] } })
    .select("name email kycStatus kycDocuments kycRejectionReason createdAt")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean() as unknown as ProviderWithKyc[];

  function ProviderRow({ p }: { p: ProviderWithKyc }) {
    const cfg = STATUS_CONFIG[p.kycStatus as keyof typeof STATUS_CONFIG];
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{p.name}</p>
            <p className="text-sm text-slate-500">{p.email}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Submitted {new Date(p.createdAt).toLocaleDateString("en-PH")}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 flex-shrink-0 ${cfg?.cls}`}>
            {cfg?.icon}{cfg?.label}
          </span>
        </div>

        {/* Documents */}
        {p.kycDocuments.length > 0 && (
          <div className="px-5 pb-4 space-y-1.5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Documents</p>
            {p.kycDocuments.map((doc, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <p className="text-sm text-slate-700 capitalize">{doc.type.replace(/_/g, " ")}</p>
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        )}

        {p.kycStatus === "rejected" && p.kycRejectionReason && (
          <div className="px-5 pb-4">
            <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2.5">
              Rejection reason: {p.kycRejectionReason}
            </p>
          </div>
        )}

        {/* Admin actions — only for pending */}
        {p.kycStatus === "pending" && (
          <div className="border-t border-slate-100 px-5 py-3 bg-slate-50">
            <AdminKycActions userId={p._id.toString()} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">KYC Review</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          {pending.length} provider{pending.length !== 1 ? "s" : ""} awaiting verification
        </p>
      </div>

      {/* Pending section */}
      {pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No pending KYC submissions.
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
            Pending ({pending.length})
          </h3>
          {pending.map((p) => <ProviderRow key={p._id.toString()} p={p} />)}
        </div>
      )}

      {/* Reviewed section */}
      {reviewed.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Recently Reviewed
          </h3>
          {reviewed.map((p) => <ProviderRow key={p._id.toString()} p={p} />)}
        </div>
      )}
    </div>
  );
}
