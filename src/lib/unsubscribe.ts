/**
 * Unsubscribe token utilities.
 *
 * Generates and verifies HMAC-SHA256 signed tokens so users can opt out of
 * marketing emails via a single click from the email itself (no login required).
 *
 * Tokens never expire — CAN-SPAM requires unsubscribe links to remain valid.
 */

import { createHmac, timingSafeEqual } from "crypto";

// Dedicated secret for unsubscribe tokens. Keeping it separate from JWT_SECRET
// means JWT rotation doesn't silently invalidate outstanding unsubscribe links
// (CAN-SPAM requires them to remain valid). Falls back to JWT_SECRET for
// deployments that haven't added the new env var yet.
const HMAC_KEY = process.env.UNSUBSCRIBE_SECRET ?? process.env.JWT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base64urlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function base64urlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

function sign(data: string): string {
  if (!HMAC_KEY) throw new Error("UNSUBSCRIBE_SECRET (or JWT_SECRET) env var is not set");
  return createHmac("sha256", HMAC_KEY).update(data).digest("base64url");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create an HMAC-SHA256 signed unsubscribe token.
 *
 * Token format (base64url-encoded): `userId:timestamp:hmac`
 */
export function generateUnsubscribeToken(userId: string): string {
  const timestamp = Date.now().toString();
  const payload = `${userId}:${timestamp}`;
  const hmac = sign(payload);
  return base64urlEncode(Buffer.from(`${payload}:${hmac}`));
}

/**
 * Verify an unsubscribe token and extract the userId.
 *
 * Returns `{ userId }` on success, or `null` if the token is malformed or the
 * HMAC does not match.
 */
export function verifyUnsubscribeToken(token: string): { userId: string } | null {
  try {
    const decoded = base64urlDecode(token).toString("utf-8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) return null;

    const payload = decoded.slice(0, lastColon);   // "userId:timestamp"
    const hmac    = decoded.slice(lastColon + 1);   // "hmac"

    const expectedHmac = sign(payload);

    // Constant-time comparison prevents timing attacks that could be used to
    // forge a valid HMAC byte-by-byte against this unauthenticated endpoint.
    const a = Buffer.from(hmac, "utf-8");
    const b = Buffer.from(expectedHmac, "utf-8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const firstColon = payload.indexOf(":");
    if (firstColon === -1) return null;

    const userId = payload.slice(0, firstColon);
    if (!userId) return null;

    return { userId };
  } catch {
    return null;
  }
}

/**
 * Build the full unsubscribe URL for a given user.
 */
export function generateUnsubscribeUrl(userId: string): string {
  const token = generateUnsubscribeToken(userId);
  return `${APP_URL}/unsubscribe?token=${token}`;
}
