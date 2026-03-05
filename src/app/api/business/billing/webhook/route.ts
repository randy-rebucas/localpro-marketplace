/**
 * This endpoint is intentionally disabled.
 *
 * Subscription billing events (checkout_session.payment.paid with
 * metadata.type === "subscription") are handled by the central webhook:
 *   POST /api/webhooks/paymongo
 *
 * Register ONLY that URL in the PayMongo dashboard.
 */
import { NextResponse } from "next/server";

export const POST = () =>
  NextResponse.json({ error: "Use /api/webhooks/paymongo" }, { status: 410 });
