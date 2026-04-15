"use client";

import Image from "next/image";
import { useState } from "react";

interface BlogFeaturedImageProps {
  src: string;
  alt: string;
  title?: string;
  priority?: boolean;
}

/**
 * Optimized blog featured image component
 * 
 * Uses Next.js Image for automatic:
 * - Responsive sizing
 * - Format optimization (AVIF, WebP)
 * - Lazy loading
 * - Placeholder blur
 */
export default function BlogFeaturedImage({
  src,
  alt,
  title,
  priority = false,
}: BlogFeaturedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Handle loading completion
  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  // Fallback for image loading errors
  if (hasError) {
    return (
      <div className="w-full h-96 md:h-[500px] lg:h-[600px] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center rounded-lg overflow-hidden">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
            Image failed to load
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 md:h-[500px] lg:h-[600px] overflow-hidden rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900">
      <Image
        src={src}
        alt={alt || "Featured image"}
        title={title}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 100vw"
        priority={priority}
        className={`object-cover transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        onLoadingComplete={handleLoadingComplete}
        onError={() => setHasError(true)}
        quality={85}
        placeholder="blur"
        blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'%3E%3Crect fill='%23e2e8f0' width='1200' height='630'/%3E%3C/svg%3E"
      />
      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
    </div>
  );
}
