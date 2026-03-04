"use client";

import { useEffect, useState } from "react";
import { CreditCard, Trash2, CheckCircle2, Info, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import Card, { CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface SavedMethod { last4: string; brand: string; }

const BRAND_DISPLAY: Record<string, { label: string; color: string }> = {
  visa:       { label: "Visa",       color: "text-blue-700" },
  mastercard: { label: "Mastercard", color: "text-orange-600" },
  jcb:        { label: "JCB",        color: "text-green-700" },
  amex:       { label: "Amex",       color: "text-slate-700" },
};

export function SavedCardClient() {
  const [method, setMethod] = useState<SavedMethod | null | undefined>(undefined);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    fetch("/api/recurring/saved-method")
      .then((r) => r.json())
      .then((d) => setMethod(d.savedMethod ?? null))
      .catch(() => setMethod(null));
  }, []);

  const removeCard = async () => {
    if (!confirm("Remove your saved card? Auto-pay will fall back to manual funding.")) return;
    try {
      setRemoving(true);
      const res = await fetch("/api/recurring/saved-method", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
      setMethod(null);
      toast.success("Saved card removed.");
    } catch {
      toast.error("Could not remove card.");
    } finally {
      setRemoving(false);
    }
  };

  if (method === undefined) {
    return (
      <div className="max-w-lg animate-pulse">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          <div className="h-5 bg-slate-200 rounded w-40" />
          <div className="h-20 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const brandInfo = method ? (BRAND_DISPLAY[method.brand.toLowerCase()] ?? { label: method.brand, color: "text-slate-700" }) : null;

  return (
    <div className="max-w-lg space-y-4">
      {/* Card status */}
      <Card>
        <CardBody>
          {method ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-bold ${brandInfo?.color ?? "text-slate-700"}`}>{brandInfo?.label}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  </div>
                  <p className="text-slate-700 font-mono text-sm mt-1 tracking-wider">
                    •••• •••• •••• {method.last4}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Used for auto-pay on recurring jobs</p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={removeCard}
                isLoading={removing}
                className="w-full sm:w-auto justify-center border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-7 w-7 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">No saved card</p>
                <p className="text-sm text-slate-500 mt-1">
                  A card will be saved automatically the first time you pay by card on any job.
                </p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* How it works */}
      <Card>
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <Info className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">How auto-pay works</h3>
        </div>
        <CardBody className="space-y-3">
          {[
            {
              icon: "💳",
              title: "Pay by card once",
              desc: "When you pay for any job using a credit or debit card, LocalPro saves your card for future use.",
            },
            {
              icon: "⚡",
              title: "Auto-charged on recurring jobs",
              desc: "If auto-pay is enabled on a recurring schedule and your card is saved, each spawned job is funded automatically — no manual action needed.",
            },
            {
              icon: "🔁",
              title: "3DS / failed charges fall back",
              desc: "If your bank requires 3D Secure verification or the charge fails, you'll receive a notification to fund escrow manually.",
            },
            {
              icon: "🚫",
              title: "GCash & PayMaya",
              desc: "Wallet-based payments cannot be saved for auto-pay. Only credit and debit cards are supported.",
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="text-lg leading-none flex-shrink-0 mt-0.5">{icon}</span>
              <div>
                <p className="text-sm font-medium text-slate-800">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Security note */}
      <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
        <ShieldCheck className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          Card details are never stored on LocalPro servers. Payments are processed securely by <strong>PayMongo</strong> — a PCI-DSS compliant payment processor.
        </p>
      </div>
    </div>
  );
}
