import { NextRequest } from "next/server";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "PHP"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPHP(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 7) return formatDate(date);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "just now";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function apiResponse<T>(data: T, status = 200) {
  return Response.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

// ─── withHandler ──────────────────────────────────────────────────────────────
// Wraps a route handler:
//   1. Rate limiting (100 req / 60s per IP)
//   2. AppError → typed HTTP response
//   3. Unhandled errors → 500

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteContext = { params: Promise<any> };
type RouteHandler = (req: NextRequest, ctx: RouteContext) => Promise<Response>;

export function withHandler(fn: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx: RouteContext) => {
    // Rate limit by IP (skip for SSE endpoints — they hold connections open)
    const isSSE = req.headers.get("accept") === "text/event-stream";
    if (!isSSE) {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        req.headers.get("x-real-ip") ??
        "unknown";

      const rl = checkRateLimit(ip, { windowMs: 60_000, max: 100 });
      if (!rl.ok) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please slow down." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(
                Math.ceil((rl.resetAt - Date.now()) / 1000)
              ),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }
    }

    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof AppError) {
        return apiError(err.message, err.statusCode);
      }
      console.error("[API Error]", err);
      return apiError("Internal server error", 500);
    }
  };
}
