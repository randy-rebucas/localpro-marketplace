/**
 * contactFilter.ts
 * Detects and masks personal contact information in chat messages
 * to prevent direct/bypass transactions outside the platform.
 */

const CONTACT_PATTERNS: RegExp[] = [
  // Philippine mobile numbers: 09XXXXXXXXX or +639XXXXXXXXX
  /\b(09|\+639)\d{9}\b/g,
  // Generic phone formats: 555-123-4567 / 555.123.4567 / 555 123 4567
  /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g,
  // Email addresses
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  // Social / messaging app names
  /\b(viber|whatsapp|telegram|fb|facebook|instagram|snapchat|tiktok|gcash|paymaya|maya)\b/gi,
  // URLs
  /\b(https?:\/\/|www\.)\S+/gi,
];

/**
 * Replace any detected contact info with a placeholder.
 * Resets lastIndex before each pattern so repeated calls are safe.
 */
export function maskContactInfo(text: string): string {
  let out = text;
  for (const pattern of CONTACT_PATTERNS) {
    pattern.lastIndex = 0;
    out = out.replace(pattern, "[contact info removed]");
  }
  return out;
}

/**
 * Returns true if the text contains any detectable contact info.
 * Useful for client-side warnings.
 */
export function containsContactInfo(text: string): boolean {
  return CONTACT_PATTERNS.some((p) => {
    p.lastIndex = 0;
    return p.test(text);
  });
}
