"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function QuoteAcceptButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/accept`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to accept quote"); return; }
      toast.success("Quote accepted! Provider has been assigned.");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
      disabled={loading}
      onClick={accept}
    >
      {loading ? "Accepting..." : "Accept"}
    </button>
  );
}
