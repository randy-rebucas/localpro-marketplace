"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function initialsFromName(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export interface UserAvatarProps {
  avatarUrl?: string | null;
  gravatarUrl?: string | null;
  name?: string | null;
  size: number;
  className?: string;
  roundedClass?: string;
  /** Applied to the initials fallback wrapper */
  fallbackClassName?: string;
  alt?: string;
}

/**
 * Avatar display: custom photo → Gravatar (404 when missing) → initials.
 */
export function UserAvatar({
  avatarUrl,
  gravatarUrl,
  name,
  size,
  className,
  roundedClass = "rounded-full",
  fallbackClassName = "bg-slate-400 text-white",
  alt,
}: UserAvatarProps) {
  const candidates = useMemo(() => {
    const raw = [avatarUrl, gravatarUrl]
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);
    return [...new Set(raw)];
  }, [avatarUrl, gravatarUrl]);

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [avatarUrl, gravatarUrl]);

  const url = candidates[idx];
  const showInitials = idx >= candidates.length || !url;

  return (
    <div
      className={cn("relative flex-shrink-0 overflow-hidden", roundedClass, className)}
      style={{ width: size, height: size }}
    >
      {showInitials ? (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center font-bold select-none",
            roundedClass,
            fallbackClassName
          )}
          style={{ fontSize: Math.max(10, Math.floor(size * 0.38)) }}
        >
          {initialsFromName(name)}
        </div>
      ) : (
        <Image
          src={url}
          alt={alt ?? name ?? "Avatar"}
          width={size}
          height={size}
          className={cn("h-full w-full object-cover", roundedClass)}
          onError={() => setIdx((i) => i + 1)}
        />
      )}
    </div>
  );
}
