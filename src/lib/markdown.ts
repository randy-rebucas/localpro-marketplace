import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

/**
 * Parse markdown → HTML, then sanitize to prevent XSS.
 * Safe for use in both server components (via jsdom) and client components.
 */
export function sanitizeMarkdown(src: string): string {
  return DOMPurify.sanitize(marked(src, { async: false }) as string);
}
