import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * POST /api/csp-report
 *
 * Receives Content-Security-Policy violation reports from browsers.
 * CSP violations indicate potential XSS attempts, misconfigured sources,
 * or browser extension interference.
 *
 * Configured in next.config.ts via the `report-uri /api/csp-report` directive.
 * Reports are forwarded to Sentry for visibility.
 */
export async function POST(req: NextRequest) {
  try {
    const report = await req.json() as {
      "csp-report"?: {
        "blocked-uri"?: string;
        "violated-directive"?: string;
        "source-file"?: string;
        "line-number"?: number;
        "document-uri"?: string;
      };
    };

    const csp = report["csp-report"];
    if (!csp) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Log to Sentry as a breadcrumb + message (not an error — these are often benign)
    Sentry.addBreadcrumb({
      type: "security",
      category: "csp-violation",
      level: "warning",
      data: {
        blockedUri:         csp["blocked-uri"],
        violatedDirective:  csp["violated-directive"],
        sourceFile:         csp["source-file"],
        lineNumber:         csp["line-number"],
        documentUri:        csp["document-uri"],
      },
    });

    Sentry.captureMessage(`CSP Violation: ${csp["violated-directive"]} blocked ${csp["blocked-uri"]}`, {
      level: "warning",
      tags: { type: "csp-violation" },
      extra: {
        blockedUri:        csp["blocked-uri"],
        violatedDirective: csp["violated-directive"],
        sourceFile:        csp["source-file"],
        documentUri:       csp["document-uri"],
      },
    });

    console.warn("[CSP] Violation reported:", JSON.stringify(csp));
  } catch {
    // Malformed report — ignore silently
  }

  // Always return 204 — browsers don't retry on other status codes
  return new Response(null, { status: 204 });
}
