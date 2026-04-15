import crypto from "crypto";

/**
 * Blog Preview Token Management
 * 
 * Generates secure tokens for previewing draft/scheduled blogs
 * Tokens are time-limited and can only be used by authenticated staff
 */

export interface PreviewTokenPayload {
  blogId: string;
  authorId: string;
  issuedAt: number;
  expiresAt: number;
}

const PREVIEW_TOKEN_SECRET = process.env.PREVIEW_TOKEN_SECRET || "dev-preview-secret-change-in-production";
const PREVIEW_TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Generate a secure preview token for a blog
 */
export function generatePreviewToken(blogId: string, authorId: string): string {
  const now = Date.now();
  const payload: PreviewTokenPayload = {
    blogId,
    authorId,
    issuedAt: now,
    expiresAt: now + PREVIEW_TOKEN_DURATION,
  };

  const tokenData = JSON.stringify(payload);
  const hmac = crypto
    .createHmac("sha256", PREVIEW_TOKEN_SECRET)
    .update(tokenData)
    .digest("hex");

  // Combine payload and HMAC in base64
  const token = Buffer.from(`${tokenData}.${hmac}`).toString("base64");
  return token;
}

/**
 * Verify and decode a preview token
 */
export function verifyPreviewToken(
  token: string
): PreviewTokenPayload | null {
  try {
    // Decode from base64
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [tokenDataStr, providedHmac] = decoded.split(".");

    if (!tokenDataStr || !providedHmac) {
      return null;
    }

    // Verify HMAC
    const expectedHmac = crypto
      .createHmac("sha256", PREVIEW_TOKEN_SECRET)
      .update(tokenDataStr)
      .digest("hex");

    if (providedHmac !== expectedHmac) {
      console.warn("[Preview Token] HMAC verification failed");
      return null;
    }

    // Parse and validate payload
    const payload: PreviewTokenPayload = JSON.parse(tokenDataStr);

    // Check expiration
    if (Date.now() > payload.expiresAt) {
      console.warn("[Preview Token] Token expired");
      return null;
    }

    return payload;
  } catch (error) {
    console.error("[Preview Token] Error verifying token:", error);
    return null;
  }
}
