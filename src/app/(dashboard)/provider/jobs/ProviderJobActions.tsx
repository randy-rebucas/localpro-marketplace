"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UploadCloud } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { JobStatus, EscrowStatus } from "@/types";

interface Props {
  jobId: string;
  status: JobStatus;
  escrowStatus: EscrowStatus;
  beforePhoto?: string | null;
  afterPhoto?: string | null;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  label: string;
  loading: boolean;
  onSubmit: (dataUrl: string) => void;
}

function PhotoUploadModal({ isOpen, onClose, title, description, label, loading, onSubmit }: PhotoModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function reset() {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Photo must be under 5 MB");
      e.target.value = "";
      return;
    }
    const dataUrl = await fileToBase64(file);
    setPreview(dataUrl);
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-500">{description}</p>

        {/* Upload area */}
        <div
          className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-48 rounded-lg object-contain" />
          ) : (
            <>
              <UploadCloud className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">Click to upload photo</p>
              <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WEBP · Max 5 MB</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleFile}
          />
        </div>

        {preview && (
          <button
            type="button"
            className="text-xs text-slate-400 hover:text-slate-600 underline"
            onClick={(e) => { e.stopPropagation(); reset(); }}
          >
            Remove photo
          </button>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            isLoading={loading}
            disabled={!preview}
            onClick={() => preview && onSubmit(preview)}
          >
            {label}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function ProviderJobActions({ jobId, status, escrowStatus, beforePhoto, afterPhoto }: Props) {
  const router = useRouter();
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [loading, setLoading] = useState(false);

  async function startJob(beforePhotoData: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/start`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ beforePhoto: beforePhotoData }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to start job"); return; }
      toast.success("Job started! Before photo saved.");
      setShowStartModal(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function markComplete(afterPhotoData: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/mark-complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ afterPhoto: afterPhotoData }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to mark complete"); return; }
      toast.success("Job marked as completed. Awaiting client approval.");
      setShowCompleteModal(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  // Waiting for escrow
  if (status !== "completed" && escrowStatus !== "funded") {
    return <p className="text-xs text-amber-600">⚠ Waiting for client to fund escrow.</p>;
  }

  // Assigned + funded → Start Job
  if (status === "assigned" && escrowStatus === "funded") {
    return (
      <>
        <Button size="sm" onClick={() => setShowStartModal(true)}>
          Start Job
        </Button>
        <PhotoUploadModal
          isOpen={showStartModal}
          onClose={() => setShowStartModal(false)}
          title="Start Job — Before Photo"
          description="Take a photo of the work area before you begin. This protects both you and the client."
          label="Start Job"
          loading={loading}
          onSubmit={startJob}
        />
      </>
    );
  }

  // In progress → show before photo + Mark as Completed
  if (status === "in_progress") {
    return (
      <>
        <div className="flex flex-wrap items-center gap-3">
          {beforePhoto && (
            <a href={beforePhoto} target="_blank" rel="noopener noreferrer">
              <img src={beforePhoto} alt="Before" className="h-12 w-12 rounded-lg object-cover border border-slate-200 hover:opacity-80 transition-opacity" title="Before photo" />
            </a>
          )}
          <Button size="sm" onClick={() => setShowCompleteModal(true)}>
            Mark as Completed
          </Button>
        </div>
        <PhotoUploadModal
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          title="Mark Complete — After Photo"
          description="Upload a photo of the completed work. The client will see this when releasing payment."
          label="Mark as Completed"
          loading={loading}
          onSubmit={markComplete}
        />
      </>
    );
  }

  // Completed → show before/after side-by-side
  if (status === "completed") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {(beforePhoto || afterPhoto) && (
          <div className="flex gap-2">
            {beforePhoto && (
              <a href={beforePhoto} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1">
                <img src={beforePhoto} alt="Before" className="h-12 w-12 rounded-lg object-cover border border-slate-200 hover:opacity-80 transition-opacity" />
                <span className="text-xs text-slate-400">Before</span>
              </a>
            )}
            {afterPhoto && (
              <a href={afterPhoto} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1">
                <img src={afterPhoto} alt="After" className="h-12 w-12 rounded-lg object-cover border border-slate-200 hover:opacity-80 transition-opacity" />
                <span className="text-xs text-slate-400">After</span>
              </a>
            )}
          </div>
        )}
        <p className="text-xs text-slate-400">Awaiting client approval and escrow release.</p>
      </div>
    );
  }

  return null;
}
