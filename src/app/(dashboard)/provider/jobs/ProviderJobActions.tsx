"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UploadCloud, X, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { JobStatus, EscrowStatus, UploadFolder } from "@/types";

interface Props {
  jobId: string;
  status: JobStatus;
  escrowStatus: EscrowStatus;
  beforePhoto?: string[];
  afterPhoto?: string[];
}

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_PHOTOS = 3;

// ─── Image lightbox ──────────────────────────────────────────────────────────

function ImageLightbox({
  images, startIndex, onClose,
}: { images: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft")  setIdx((i) => (i - 1 + images.length) % images.length);
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); }}
          className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <img
        src={images[idx]}
        alt={`Photo ${idx + 1}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
      />

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); }}
          className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <p className="absolute bottom-4 text-xs text-white/60">
          {idx + 1} / {images.length}
        </p>
      )}
    </div>
  );
}

// ─── Thumbnail strip ──────────────────────────────────────────────────────────

function PhotoStrip({ urls, label }: { urls: string[]; label: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex gap-1">
        {urls.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightbox(i)}
            className="overflow-hidden rounded-lg border border-slate-200 hover:ring-2 hover:ring-primary/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Image src={url} alt={`${label} ${i + 1}`} width={48} height={48} className="h-12 w-12 object-cover" />
          </button>
        ))}
      </div>
      {lightbox !== null && (
        <ImageLightbox images={urls} startIndex={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadPhoto(file: File, folder: UploadFolder): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);

  const res = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data.url as string;
}

// ─── Photo upload modal ────────────────────────────────────────────────────────

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  label: string;
  uploading: boolean;
  /** Remaining upload slots (MAX_PHOTOS − already saved). Default = MAX_PHOTOS */
  slotsRemaining?: number;
  onSubmit: (files: File[]) => void;
}

function PhotoUploadModal({
  isOpen, onClose, title, description, label, uploading,
  slotsRemaining = MAX_PHOTOS, onSubmit,
}: PhotoModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Revoke all object URLs on unmount
  useEffect(() => {
    return () => { previews.forEach(URL.revokeObjectURL); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    previews.forEach(URL.revokeObjectURL);
    setFiles([]);
    setPreviews([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() { reset(); onClose(); }

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const remaining = slotsRemaining - files.length;
    if (remaining <= 0) { toast.error(`Maximum ${MAX_PHOTOS} photos allowed`); return; }
    const toAdd = Array.from(selected).slice(0, remaining);
    const valid: File[] = [];
    const newPreviews: string[] = [];
    for (const f of toAdd) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        toast.error(`${f.name}: only JPEG, PNG or WEBP allowed`); continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: must be under 8 MB`); continue;
      }
      valid.push(f);
      newPreviews.push(URL.createObjectURL(f));
    }
    setFiles((prev) => [...prev, ...valid]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(previews[i]);
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  const canAddMore = files.length < slotsRemaining;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-500">{description}</p>

        {/* Preview grid */}
        {previews.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt={`Photo ${i + 1}`} className="h-24 w-full rounded-xl object-cover border border-slate-200" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {canAddMore && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span className="text-xs">Add more</span>
              </button>
            )}
          </div>
        ) : (
          /* Empty drop zone */
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors select-none"
          >
            <UploadCloud className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">Click or drag & drop to upload</p>
            <p className="text-xs text-slate-400 mt-1">JPEG · PNG · WEBP &nbsp;·&nbsp; Max 8 MB each</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
        />

        <p className="text-right text-xs text-slate-400">
          <span className={files.length > 0 ? "text-primary font-medium" : ""}>{files.length}</span>
          {" / "}{slotsRemaining} photo{slotsRemaining !== 1 ? "s" : ""} selected
        </p>

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            isLoading={uploading}
            disabled={files.length === 0}
            onClick={() => onSubmit(files)}
          >
            {label}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function ProviderJobActions({ jobId, status, escrowStatus, beforePhoto: _beforePhoto, afterPhoto: _afterPhoto }: Props) {
  const router = useRouter();
  // Normalize: legacy docs may have stored a plain string before the array migration
  const beforePhoto = Array.isArray(_beforePhoto) ? _beforePhoto : _beforePhoto ? [_beforePhoto as unknown as string] : [];
  const afterPhoto  = Array.isArray(_afterPhoto)  ? _afterPhoto  : _afterPhoto  ? [_afterPhoto  as unknown as string] : [];
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function startJob(files: File[]) {
    setUploading(true);
    try {
      const photoUrls = await Promise.all(files.map((f) => uploadPhoto(f, "jobs/before")));

      const res = await fetch(`/api/jobs/${jobId}/start`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ beforePhotos: photoUrls }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to start job"); return; }
      toast.success(`Job started! ${photoUrls.length} before photo${photoUrls.length > 1 ? "s" : ""} uploaded.`);
      setShowStartModal(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  async function markComplete(files: File[]) {
    setUploading(true);
    try {
      const photoUrls = await Promise.all(files.map((f) => uploadPhoto(f, "jobs/after")));

      const res = await fetch(`/api/jobs/${jobId}/mark-complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ afterPhotos: photoUrls }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to mark complete"); return; }
      toast.success(`Job marked as completed. ${photoUrls.length} after photo${photoUrls.length > 1 ? "s" : ""} uploaded.`);
      setShowCompleteModal(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
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
          title="Start Job — Before Photos"
          description="Upload up to 3 before photos of the work area. This protects both you and the client."
          label="Start Job"
          uploading={uploading}
          slotsRemaining={Math.max(0, MAX_PHOTOS - (beforePhoto?.length ?? 0))}
          onSubmit={startJob}
        />
      </>
    );
  }

  // In progress → show before photos + Mark as Completed
  if (status === "in_progress") {
    return (
      <>
        <div className="flex flex-wrap items-center gap-3">
          {beforePhoto && beforePhoto.length > 0 && (
            <PhotoStrip urls={beforePhoto} label="Before" />
          )}
          <Button size="sm" onClick={() => setShowCompleteModal(true)}>
            Mark as Completed
          </Button>
        </div>
        <PhotoUploadModal
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          title="Mark Complete — After Photos"
          description="Upload up to 3 after photos of the completed work. The client will see these when releasing payment."
          label="Mark as Completed"
          uploading={uploading}
          slotsRemaining={Math.max(0, MAX_PHOTOS - (afterPhoto?.length ?? 0))}
          onSubmit={markComplete}
        />
      </>
    );
  }

  // Completed → show before/after side-by-side
  if (status === "completed") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {((beforePhoto && beforePhoto.length > 0) || (afterPhoto && afterPhoto.length > 0)) && (
          <div className="flex gap-3">
            {beforePhoto && beforePhoto.length > 0 && <PhotoStrip urls={beforePhoto} label="Before" />}
            {afterPhoto  && afterPhoto.length  > 0 && <PhotoStrip urls={afterPhoto}  label="After"  />}
          </div>
        )}
        <p className="text-xs text-slate-400">Awaiting client approval and escrow release.</p>
      </div>
    );
  }

  return null;
}
