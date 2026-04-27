import crypto from "crypto";

export interface PreviewTokenPayload {
  blogId: string;
  authorId: string;
  issuedAt: number;
  expiresAt: number;
}

function getSecret(): string {
  const s = process.env.PREVIEW_TOKEN_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("PREVIEW_TOKEN_SECRET is not set");
  }
  return s ?? "dev-preview-secret";
}
const PREVIEW_TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000;

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
    .createHmac("sha256", getSecret())
    .update(tokenData)
    .digest("hex");

  const token = Buffer.from(`${tokenData}.${hmac}`).toString("base64");
  return token;
}

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
      .createHmac("sha256", getSecret())
      .update(tokenDataStr)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedHmac, "hex");
    const providedBuf = Buffer.from(providedHmac, "hex");
    if (
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
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
