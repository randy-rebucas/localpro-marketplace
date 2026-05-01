"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  ShieldCheck, ShieldX, Clock, Upload, ExternalLink,
  CheckCircle2, FileText, X, Loader2, Award, BadgeCheck,
  Briefcase, Wallet, UserCheck, GraduationCap, Send,
  Receipt, ClipboardList,
} from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import type { VerificationChecklistItem } from "@/lib/provider-verification-checklist";

const DOC_TYPES = [
  {
    value: "government_id",
    label: "Government-issued ID",
    hint: "UMID, Passport, or Driver's License",
    required: true,
    badge: { label: "Legit Badge", color: "text-blue-700 bg-blue-50 border-blue-200", icon: BadgeCheck },
    note: "Unlocks identity verification alongside Selfie with ID",
  },
  {
    value: "selfie_with_id",
    label: "Selfie with ID",
    hint: "Hold your government ID next to your face",
    required: true,
    badge: { label: "Legit Badge", color: "text-blue-700 bg-blue-50 border-blue-200", icon: BadgeCheck },
    note: "Both ID + selfie required to earn the Legit badge",
  },
  {
    value: "tesda_certificate",
    label: "TESDA / NC Certificate",
    hint: "TESDA Certificate or NC Certificate",
    required: false,
    badge: { label: "Verified Provider", color: "text-violet-700 bg-violet-50 border-violet-200", icon: Award },
    note: "Proves your trade skills to potential clients",
  },
  {
    value: "training_certificate",
    label: "Training Certification",
    hint: "Any professional training or skills cert",
    required: false,
    badge: { label: "Certified Pro", color: "text-indigo-700 bg-indigo-50 border-indigo-200", icon: GraduationCap },
    note: "Highlights advanced training beyond standard qualifications",
  },
  {
    value: "business_permit",
    label: "Business Permit",
    hint: "DTI Registration or Local Business Permit",
    required: false,
    badge: { label: "Business Verified", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: Briefcase },
    note: "Shows clients you run a legitimate registered business",
  },
  {
    value: "bir_registration",
    label: "BIR / TIN documentation",
    hint: "Certificate of Registration (Form 2303) or official BIR TIN proof",
    required: false,
    badge: { label: "Tax Verified", color: "text-amber-800 bg-amber-50 border-amber-200", icon: Receipt },
    note: "Required for business tax compliance and payout verification",
  },
  {
    value: "bank_verification",
    label: "Bank / E-Wallet Verification",
    hint: "Bank statement, GCash, or Maya account screenshot",
    required: false,
    badge: { label: "Payment Verified", color: "text-teal-700 bg-teal-50 border-teal-200", icon: Wallet },
    note: "Enables faster payouts and builds payout trust",
  },
  {
    value: "background_check",
    label: "Background Check",
    hint: "NBI Clearance or Police Clearance",
    required: false,
    badge: { label: "Trusted Pro", color: "text-rose-700 bg-rose-50 border-rose-200", icon: UserCheck },
    note: "Strongest trust signal — clients prefer background-checked providers",
  },
  {
    value: "other",
    label: "Other Document",
    hint: "Any additional supporting document",
    required: false,
    badge: null,
    note: null,
  },
] as const;

type DocType = (typeof DOC_TYPES)[number]["value"];

interface KycDoc { type: string; url: string; uploadedAt: string; }
interface KycState {
  kycStatus: "none" | "pending" | "approved" | "rejected";
  kycDocuments: KycDoc[];
  kycRejectionReason?: string | null;
  accountType?: "personal" | "business";
  checklist?: VerificationChecklistItem[];
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export default function KycUpload() {
  const [state, setState] = useState<KycState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Per-type: "idle" | "uploading" | "staged" | "submitting" | "done"
  const [itemState, setItemState] = useState<Partial<Record<DocType, "uploading" | "staged" | "submitting">>>({});
  // Per-type staged URL (cleared after submit)
  const [staged, setStaged] = useState<Partial<Record<DocType, string>>>({});
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  async function refreshKycFromApi(): Promise<KycState | null> {
    const r = await apiFetch("/api/kyc");
    if (!r.ok) return null;
    const data = (await r.json()) as KycState;
    setState(data);
    return data;
  }

  useEffect(() => {
    refreshKycFromApi().finally(() => setIsLoading(false));
  }, []);

  function setItem(type: DocType, s: "uploading" | "staged" | "submitting" | null) {
    setItemState((prev) => {
      const next = { ...prev };
      if (s === null) delete next[type]; else next[type] = s;
      return next;
    });
  }

  async function handleFileChange(type: DocType, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { toast.error("File exceeds 10 MB limit"); return; }

    setItem(type, "uploading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "kyc");
      const res = await apiFetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setStaged((prev) => ({ ...prev, [type]: data.url as string }));
      setItem(type, "staged");
      toast.success("File ready — click Submit to save");
    } catch {
      toast.error("Failed to upload file");
      setItem(type, null);
    }
  }

  function discardStaged(type: DocType) {
    setStaged((prev) => { const n = { ...prev }; delete n[type]; return n; });
    setItem(type, null);
  }

  async function submitDoc(type: DocType) {
    const url = staged[type];
    if (!url) return;
    setItem(type, "submitting");

    // Merge: existing submitted docs + this new one (replaces same type if exists)
    const existing = stateRef.current?.kycDocuments ?? [];
    const merged = [
      ...existing.filter((d) => d.type !== type),
      { type, url, uploadedAt: new Date().toISOString() },
    ];

    try {
      const res = await apiFetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: merged }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Submission failed"); setItem(type, "staged"); return; }
      toast.success(`${DOC_TYPES.find((d) => d.value === type)?.label} submitted!`);
      await refreshKycFromApi();
      setStaged((prev) => { const n = { ...prev }; delete n[type]; return n; });
      setItem(type, null);
    } catch {
      toast.error("Something went wrong");
      setItem(type, "staged");
    }
  }

  if (isLoading) return <div className="h-32 animate-pulse bg-slate-100 rounded-xl" />;

  const status = state?.kycStatus ?? "none";
  const canUpload = status !== "approved";
  const submittedByType = Object.fromEntries((state?.kycDocuments ?? []).map((d) => [d.type, d]));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Identity Verification (KYC)</h3>
          <p className="text-xs text-slate-500 mt-0.5">Upload documents to build client trust and unlock more features</p>
        </div>
        {status === "approved" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified
          </span>
        )}
        {status === "pending" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <Clock className="h-3.5 w-3.5" /> Under Review
          </span>
        )}
        {status === "rejected" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1">
            <ShieldX className="h-3.5 w-3.5" /> Rejected
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* ── Status banners ── */}
        {status === "approved" && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
            ✅ Your identity has been verified. The verified badge is now visible on your profile.
          </p>
        )}
        {status === "pending" && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            ⏳ Your documents are under review. This typically takes 1–2 business days.
            You can still upload additional documents below to strengthen your application.
          </p>
        )}
        {status === "rejected" && (
          <div className="text-sm text-red-700 bg-red-50 rounded-lg p-3">
            <p className="font-medium">KYC Rejected</p>
            {state?.kycRejectionReason && <p className="mt-1 text-red-600">{state.kycRejectionReason}</p>}
            <p className="mt-2 text-xs text-red-500">Re-upload the correct documents below and submit each one.</p>
          </div>
        )}

        {/* ── Verification checklist ── */}
        {state?.checklist && state.checklist.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 dark:bg-slate-800/40 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary flex-shrink-0" />
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                Verification checklist
              </h4>
            </div>
            <ul className="space-y-3">
              {state.checklist.map((row) => (
                <li key={row.id} className="text-sm border-b border-slate-100 dark:border-slate-700 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{row.title}</span>
                    <span
                      className={[
                        "flex-shrink-0 text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 border",
                        row.status === "Verified"
                          ? "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800"
                          : row.status === "Rejected"
                            ? "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800"
                            : "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-800",
                      ].join(" ")}
                    >
                      {row.status}
                    </span>
                  </div>
                  {row.nextSteps ? (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">{row.nextSteps}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Section label ── */}
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-violet-500 flex-shrink-0" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Upload documents to earn badges and build client trust
          </p>
        </div>

        {/* ── Per-type cards ── */}
        <div className="space-y-2">
          {DOC_TYPES.map((dt) => {
            const submitted = submittedByType[dt.value] as KycDoc | undefined;
            const stagedUrl = staged[dt.value];
            const phase = itemState[dt.value] ?? null;
            const isUploading  = phase === "uploading";
            const isStaged     = phase === "staged";
            const isSubmitting = phase === "submitting";
            const hasFile      = !!stagedUrl || !!submitted;
            const isRequiredEmpty = dt.required && !hasFile;

            return (
              <div
                key={dt.value}
                className={[
                  "rounded-xl border px-4 py-3 transition-colors",
                  isStaged || isSubmitting
                    ? "border-primary/30 bg-primary/5 dark:border-primary/40 dark:bg-primary/10"
                    : hasFile
                    ? "border-green-200 bg-green-50/60 dark:border-green-800 dark:bg-green-900/10"
                    : isRequiredEmpty
                    ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/10"
                    : "border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/30",
                ].join(" ")}
              >
                {/* ── Top row: icon + label + badge + view + upload btn ── */}
                <div className="flex items-center gap-3">
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {isUploading || isSubmitting ? (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    ) : isStaged ? (
                      <FileText className="h-5 w-5 text-primary" />
                    ) : hasFile ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : isRequiredEmpty ? (
                      <FileText className="h-5 w-5 text-amber-400" />
                    ) : (
                      <FileText className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>

                  {/* Label + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{dt.label}</span>
                      {dt.required && (
                        <span className="text-[10px] font-semibold text-red-500 bg-red-50 border border-red-100 rounded px-1">Required</span>
                      )}
                      {dt.badge && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-1.5 py-0.5 ${dt.badge.color}`}>
                          <dt.badge.icon className="h-2.5 w-2.5" />
                          {dt.badge.label}
                        </span>
                      )}
                    </div>
                    {stagedUrl ? (
                      <p className="text-xs text-primary font-medium truncate mt-0.5">{stagedUrl.split("/").pop()}</p>
                    ) : submitted ? (
                      <p className="text-xs text-slate-400 mt-0.5">Submitted {new Date(submitted.uploadedAt).toLocaleDateString()}</p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">{dt.note ?? dt.hint}</p>
                    )}
                  </div>

                  {/* View submitted */}
                  {submitted && (
                    <a href={submitted.url} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {/* Upload / Replace button */}
                  {canUpload && !isStaged && !isSubmitting && (
                    <label className={[
                      "flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors",
                      isUploading
                        ? "opacity-50 cursor-not-allowed border-slate-200 text-slate-400"
                        : hasFile
                        ? "border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                        : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10",
                    ].join(" ")}>
                      {isUploading
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                        : hasFile
                        ? <><Upload className="h-3.5 w-3.5" /> Replace</>
                        : <><Upload className="h-3.5 w-3.5" /> Upload</>
                      }
                      <input type="file" className="hidden" accept="image/*,.pdf"
                        disabled={isUploading}
                        onChange={(e) => handleFileChange(dt.value, e)} />
                    </label>
                  )}
                </div>

                {/* ── Staged action row: discard + submit ── */}
                {isStaged && (
                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-primary/10">
                    <div className="flex items-center gap-2">
                      {/* Replace with different file */}
                      <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                        <Upload className="h-3.5 w-3.5" /> Replace
                        <input type="file" className="hidden" accept="image/*,.pdf"
                          onChange={(e) => handleFileChange(dt.value, e)} />
                      </label>
                      {/* Discard */}
                      <button onClick={() => discardStaged(dt.value)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors">
                        <X className="h-3.5 w-3.5" /> Discard
                      </button>
                    </div>
                    {/* Submit this doc */}
                    <button onClick={() => submitDoc(dt.value)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors">
                      <Send className="h-3.5 w-3.5" /> Submit document
                    </button>
                  </div>
                )}

                {/* Submitting overlay row */}
                {isSubmitting && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-primary/10 text-xs text-primary font-medium">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {canUpload && (
          <p className="text-xs text-slate-400 text-center">
            Accepted formats: JPG, PNG, PDF · Max 10 MB per file · Each document is submitted individually
          </p>
        )}
      </div>
    </div>
  );
}
