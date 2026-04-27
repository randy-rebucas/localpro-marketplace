import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * POST /api/csp-report
 *
 * Receives Content-Security-Policy violation reports from browsers.
 * CSP violations indicate potential XSS attempts, misconfigured sources,
 * or browser extension interference.
 *
 * Configured in next.config.ts via the `report-uri /api/csp-report` directive.
 * Reports are forwarded to Sentry for visibility.
 *
 * Always returns 204 — any other status code may cause browsers to retry.
 */

const MAX_FIELD_LEN = 500;
const ALWAYS_204 = new Response(null, { status: 204 });

function truncate(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  return v.length > MAX_FIELD_LEN ? `${v.slice(0, MAX_FIELD_LEN)}…` : v;
}

/** Strip query string from a URI before logging to avoid PII leakage. */
function stripQuery(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  try {
    const u = new URL(uri);
    return `${u.origin}${u.pathname}`;
  } catch {
    return uri.split("?")[0];
  }
}

export async function POST(req: NextRequest) {
  try {
    // IP-based rate limit — unauthenticated; protect Sentry quota from flooding
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = await checkRateLimit(`csp-report:${ip}`, { windowMs: 60_000, max: 60 });
    if (!rl.ok) return ALWAYS_204;

    const body = await req.json() as {
      "csp-report"?: {
        "blocked-uri"?: string;
        "violated-directive"?: string;
        "source-file"?: string;
        "line-number"?: number;
        "document-uri"?: string;
      };
    };

    const csp = body["csp-report"];
    if (!csp) return ALWAYS_204;

    // Truncate all string fields before forwarding to Sentry
    const safe = {
      blockedUri:        truncate(csp["blocked-uri"]),
      violatedDirective: truncate(csp["violated-directive"]),
      sourceFile:        truncate(csp["source-file"]),
      lineNumber:        typeof csp["line-number"] === "number" ? csp["line-number"] : undefined,
      documentUri:       truncate(csp["document-uri"]),
    };

    Sentry.addBreadcrumb({
      type: "security",
      category: "csp-violation",
      level: "warning",
      data: safe,
    });

    Sentry.captureMessage(
      `CSP Violation: ${safe.violatedDirective} blocked ${safe.blockedUri}`,
      {
        level: "warning",
        tags: { type: "csp-violation" },
        extra: safe,
      }
    );

    // Strip query params from documentUri — may contain PII (e.g. ?userId=...)
    console.warn("[CSP] Violation:", safe.violatedDirective, "→", stripQuery(csp["document-uri"]));
  } catch {
    // Malformed report or internal error — ignore silently
  }

  return ALWAYS_204;
}
