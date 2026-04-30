import "server-only";
import { createHash } from "crypto";

/**
 * Gravatar image URL for an email. Uses d=404 so the image fails when the user
 * has no Gravatar, allowing UIs to fall back to initials.
 */
export function gravatarUrlForEmail(
  email: string | null | undefined,
  size: number
): string | null {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;
  const hash = createHash("md5").update(normalized).digest("hex");
  const s = Math.min(512, Math.max(1, Math.floor(size)));
  return `https://www.gravatar.com/avatar/${hash}?s=${s}&d=404&r=pg`;
}
