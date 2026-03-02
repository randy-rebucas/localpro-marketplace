"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";
import { BadgeCheck } from "lucide-react";

export default function AdminCertifyButton({
  userId,
  isLocalProCertified,
}: {
  userId: string;
  isLocalProCertified: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const current = isLocalProCertified;

  async function toggle() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/providers/${userId}/certify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certified: !current }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Action failed"); return; }
      toast.success(data.message);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
        current
          ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
      }`}
    >
      <BadgeCheck className="h-3.5 w-3.5" />
      {loading ? "Saving…" : current ? "Revoke LocalPro Certified" : "Grant LocalPro Certified"}
    </button>
  );
}
