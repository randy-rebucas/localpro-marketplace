"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";
import { BadgeCheck, AlertTriangle } from "lucide-react";

export default function AdminCertifyButton({
  userId,
  isLocalProCertified,
}: {
  userId: string;
  isLocalProCertified: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  async function toggle() {
    // Guard: require confirmation before revoking
    if (isLocalProCertified && !confirmRevoke) {
      setConfirmRevoke(true);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/providers/${userId}/certify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certified: !isLocalProCertified }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Action failed"); return; }
      toast.success(data.message);
      setConfirmRevoke(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (confirmRevoke) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" /> Revoke certification?
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={toggle}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg border bg-red-50 border-red-200 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving…" : "Yes, revoke"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmRevoke(false)}
          className="text-xs font-medium px-2.5 py-1 rounded-lg border bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
        isLocalProCertified
          ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
      }`}
    >
      <BadgeCheck className="h-3.5 w-3.5" />
      {loading ? "Saving…" : isLocalProCertified ? "Revoke Certification" : "Grant LocalPro Certified"}
    </button>
  );
}
