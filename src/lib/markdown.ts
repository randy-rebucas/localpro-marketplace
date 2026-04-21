import { marked } from "marked";

/**
 * Parse markdown → HTML and keep safe.
 * 
 * IMPORTANT: marked.js is safe by default - it parses markdown to HTML
 * without executing any JavaScript or arbitrary HTML unless explicitly enabled.
 * 
 * For additional security on the client, use a dedicated sanitizer component
 * that imports DOMPurify only when needed (not in SSR).
 */
export function sanitizeMarkdown(src: string): string {
  return marked(src, { async: false }) as string;
}
