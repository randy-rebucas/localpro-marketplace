"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { ImagePlus, X } from "lucide-react";
import type { JobStatus } from "@/types";

interface Props {
  jobId: string;
  status: JobStatus;
}

const ELIGIBLE_STATUSES: JobStatus[] = ["assigned", "in_progress", "completed"];
const MAX_IMAGES = 5;

export default function RaiseDisputeButton({ jobId, status }: Props) {
  const router     = useRouter();
  const fileRef    = useRef<HTMLInputElement>(null);
  const [open, setOpen]         = useState(false);
  const [reason, setReason]     = useState("");
  const [images, setImages]     = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading]   = useState(false);

  if (!ELIGIBLE_STATUSES.includes(status)) return null;

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX_IMAGES - images.length);
    const entries = newFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...entries].slice(0, MAX_IMAGES));
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function uploadAll(): Promise<string[]> {
    if (images.length === 0) return [];
    const urls: string[] = [];
    for (const { file } of images) {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      urls.push(data.url as string);
    }
    return urls;
  }

  async function submit() {
    if (reason.trim().length < 20) {
      toast.error("Please provide at least 20 characters describing the issue.");
      return;
    }
    setUploading(true);
    let evidence: string[] = [];
    try {
      evidence = await uploadAll();
    } catch {
      toast.error("Image upload failed. Try again or remove the images.");
      setUploading(false);
      return;
    } finally {
      setUploading(false);
    }

    setLoading(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, reason: reason.trim(), evidence }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to raise dispute");
        return;
      }
      toast.success("Dispute raised. Admin will review shortly.");
      setOpen(false);
      setReason("");
      setImages([]);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isBusy = uploading || loading;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2 transition-colors"
      >
        Raise a dispute
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Raise a Dispute</h3>
              <p className="text-sm text-slate-500 mt-1">
                Describe the issue clearly and attach evidence photos if available. An admin will review and resolve.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Reason <span className="text-slate-400">(min. 20 characters)</span>
              </label>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Provider did not complete the work as agreed..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{reason.trim().length} / 20 min</p>
            </div>

            {/* Evidence upload */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Evidence Photos <span className="text-slate-400">(optional, up to {MAX_IMAGES})</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="flex flex-wrap gap-2">
                {images.map(({ preview }, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={`evidence-${i}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary hover:text-primary transition-colors flex-shrink-0"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-xs">Add</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setOpen(false); setReason(""); setImages([]); }}
                disabled={isBusy}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <Button
                size="sm"
                isLoading={isBusy}
                onClick={submit}
                className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                {uploading ? "Uploading…" : "Submit Dispute"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
