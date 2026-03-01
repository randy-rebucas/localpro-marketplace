"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/fetchClient";
import { Banknote, User, Briefcase } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  jobId: string;
  jobTitle: string;
  category: string;
  budget: number;
  completedAt: string;
  client: { name: string; email: string };
  provider: { id: string; name: string; email: string } | null;
}

export default function AdminEscrowReleaseCard({
  jobId,
  jobTitle,
  category,
  budget,
  completedAt,
  client,
  provider,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function releasePayment() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/jobs/${jobId}/escrow-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release", reason: "Admin released payment after job completion" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to release payment");
        return;
      }
      toast.success("Payment released to provider!");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900 text-sm line-clamp-1">{jobTitle}</p>
          <span className="inline-block text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 font-medium mt-1">
            {category}
          </span>
        </div>
        <p className="text-lg font-bold text-slate-900 flex-shrink-0">{formatCurrency(budget)}</p>
      </div>

      {/* Parties */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <User className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <span>
            <span className="font-medium text-slate-700">Client:</span> {client.name}{" "}
            <span className="text-slate-400">({client.email})</span>
          </span>
        </div>
        {provider ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            <span>
              <span className="font-medium text-slate-700">Provider:</span> {provider.name}{" "}
              <span className="text-slate-400">({provider.email})</span>
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No provider assigned</p>
        )}
      </div>

      <p className="text-[10px] text-slate-400">Completed {new Date(completedAt).toLocaleDateString()}</p>

      {/* Release button */}
      <Button
        size="sm"
        isLoading={loading}
        disabled={!provider}
        onClick={releasePayment}
        className="w-full flex items-center gap-1.5"
      >
        <Banknote className="h-3.5 w-3.5" />
        Release Payment
      </Button>

      {!provider && (
        <p className="text-xs text-red-500 text-center -mt-2">Cannot release: no provider assigned</p>
      )}
    </div>
  );
}
