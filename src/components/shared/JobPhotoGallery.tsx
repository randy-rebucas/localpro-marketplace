"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

// ─── Lightbox ────────────────────────────────────────────────────────────────

function ImageLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + images.length) % images.length);
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIdx((i) => (i - 1 + images.length) % images.length);
          }}
          className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      <img
        src={images[idx]}
        alt={`Photo ${idx + 1}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
      />

      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIdx((i) => (i + 1) % images.length);
          }}
          className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {images.length > 1 && (
        <p className="absolute bottom-4 text-xs text-white/60">
          {idx + 1} / {images.length}
        </p>
      )}
    </div>
  );
}

// ─── Thumbnail strip (compact row) ───────────────────────────────────────────

export function PhotoStrip({ urls, label }: { urls: string[]; label: string }) {
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
            <Image
              src={url}
              alt={`${label} ${i + 1}`}
              width={48}
              height={48}
              className="h-12 w-12 object-cover"
            />
          </button>
        ))}
      </div>
      {lightbox !== null && (
        <ImageLightbox images={urls} startIndex={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

// ─── Full grid gallery (admin / detail pages) ────────────────────────────────

interface JobPhotoGalleryProps {
  beforePhoto?: string[];
  afterPhoto?: string[];
}

export default function JobPhotoGallery({ beforePhoto = [], afterPhoto = [] }: JobPhotoGalleryProps) {
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (beforePhoto.length === 0 && afterPhoto.length === 0) return null;

  function open(urls: string[], i: number) {
    setLightboxImages(urls);
    setLightboxIndex(i);
  }

  function close() {
    setLightboxImages([]);
  }

  return (
    <>
      <div className="space-y-5">
        {beforePhoto.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Before / Start Photos
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {beforePhoto.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => open(beforePhoto, i)}
                  className="group relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:ring-2 hover:ring-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <Image
                    src={url}
                    alt={`Before photo ${i + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <ImageIcon className="h-5 w-5 text-white drop-shadow" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {afterPhoto.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              After / Completion Photos
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {afterPhoto.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => open(afterPhoto, i)}
                  className="group relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:ring-2 hover:ring-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <Image
                    src={url}
                    alt={`After photo ${i + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <ImageIcon className="h-5 w-5 text-white drop-shadow" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {lightboxImages.length > 0 && (
        <ImageLightbox images={lightboxImages} startIndex={lightboxIndex} onClose={close} />
      )}
    </>
  );
}
