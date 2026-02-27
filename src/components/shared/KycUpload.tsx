"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { ShieldCheck, ShieldX, Clock, Upload, ExternalLink } from "lucide-react";
import Button from "@/components/ui/Button";

const DOC_TYPES = [
  { value: "government_id", label: "Government-issued ID (UMID, Passport, Driver's License)" },
  { value: "business_permit", label: "Business Permit / DTI Registration" },
  { value: "selfie_with_id", label: "Selfie with ID" },
  { value: "other", label: "Other Document" },
] as const;

type DocType = (typeof DOC_TYPES)[number]["value"];

interface KycDoc {
  type: string;
  url: string;
  uploadedAt: string;
}

interface KycState {
  kycStatus: "none" | "pending" | "approved" | "rejected";
  kycDocuments: KycDoc[];
  kycRejectionReason?: string | null;
}

export default function KycUpload() {
  const [state, setState] = useState<KycState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDocs, setNewDocs] = useState<{ type: DocType; url: string }[]>([]);
  const [selectedType, setSelectedType] = useState<DocType>("government_id");

  useEffect(() => {
    fetch("/api/kyc", { credentials: "include" })
      .then((r) => r.json())
      .then((data: KycState) => { setState(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  async function uploadFile(file: File) {
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "kyc");
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      return data.url as string;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file);
      setNewDocs((prev) => [...prev, { type: selectedType, url }]);
      toast.success("Document uploaded");
    } catch {
      toast.error("Failed to upload document");
    }
    e.target.value = "";
  }

  async function handleSubmit() {
    if (newDocs.length === 0) { toast.error("Please upload at least one document"); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ documents: newDocs }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Submission failed"); return; }
      toast.success("KYC documents submitted for review!");
      setState({ kycStatus: "pending", kycDocuments: newDocs.map((d) => ({ ...d, uploadedAt: new Date().toISOString() })) });
      setNewDocs([]);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <div className="h-20 animate-pulse bg-slate-100 rounded-xl" />;

  const status = state?.kycStatus ?? "none";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
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
        {status === "approved" && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
            ✅ Your identity has been verified. The verified badge is now visible on your profile.
          </p>
        )}

        {status === "pending" && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            ⏳ Your documents are under review. This typically takes 1-2 business days.
          </p>
        )}

        {status === "rejected" && (
          <div className="text-sm text-red-700 bg-red-50 rounded-lg p-3">
            <p className="font-medium">KYC Rejected</p>
            {state?.kycRejectionReason && (
              <p className="mt-1 text-red-600">{state.kycRejectionReason}</p>
            )}
            <p className="mt-2 text-xs text-red-500">Please re-submit with the correct documents below.</p>
          </div>
        )}

        {/* Submitted documents */}
        {(state?.kycDocuments?.length ?? 0) > 0 && status !== "rejected" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Submitted Documents</p>
            {state!.kycDocuments.map((doc, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-700 capitalize">{doc.type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                </div>
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Upload new documents — shown when status is none or rejected */}
        {(status === "none" || status === "rejected") && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Upload Documents</p>

            <div className="flex gap-2">
              <select
                className="input flex-1 text-sm"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as DocType)}
              >
                {DOC_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
              <label className={`inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary cursor-pointer hover:bg-primary/10 transition-colors ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}>
                <Upload className="h-4 w-4" />
                {isUploading ? "Uploading…" : "Add File"}
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} disabled={isUploading} />
              </label>
            </div>

            {/* Staged uploads */}
            {newDocs.length > 0 && (
              <div className="space-y-2">
                {newDocs.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-green-700 capitalize">{doc.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-green-500 truncate max-w-xs">{doc.url.split("/").pop()}</p>
                    </div>
                    <button onClick={() => setNewDocs((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </div>
                ))}

                <Button onClick={handleSubmit} isLoading={isSubmitting} className="w-full">
                  Submit for Review
                </Button>
              </div>
            )}

            {newDocs.length === 0 && (
              <p className="text-xs text-slate-400">
                Accepted: Government ID, Business Permit, Selfie with ID. Max 10 MB per file.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
