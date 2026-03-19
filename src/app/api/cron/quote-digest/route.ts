import { type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import { notificationService } from "@/services/notification.service";

/**
 * GET /api/cron/quote-digest
 *
 * Sends batched digest emails for users who received multiple quote_received
 * notifications within a 15-minute window. Individual emails are suppressed
 * after the first one via Redis TTL keys; this cron picks up the rest and
 * sends a single "You received X new quotes" summary email.
 *
 * Runs every 15 minutes via Vercel Cron.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const result = await notificationService.sendQuoteDigests();
    console.log(`[cron/quote-digest] Sent ${result.sent} quote digest email(s).`);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/quote-digest] Fatal error:", err);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
