import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDB } from "@/lib/db";
import Payment from "@/models/Payment";
import { isValidObjectId } from "mongoose";
import { businessOrganizationRepository } from "@/repositories";
import type { BusinessPlan } from "@/types";

/**
 * POST /api/webhooks/paypal
 *
 * Receives PayPal webhook events as a server-side backup for the return-URL
 * capture flow (/api/business/billing/confirm, /api/provider/agency/billing/confirm).
 *
 * Register this URL in PayPal Developer → My Apps → Webhooks:
 *   https://yourdomain.com/api/webhooks/paypal
 *
 * Set the following environment variables:
 *   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET  — app credentials
 *   PAYPAL_WEBHOOK_ID                       — the webhook ID from PayPal dashboard
 *   PAYPAL_MODE                              — "sandbox" | "live" (server-only)
 *
 * Events subscribed:
 *   PAYMENT.CAPTURE.COMPLETED   → activate subscription / escrow funding
 *   PAYMENT.CAPTURE.REFUNDED    → (logged; refund already processed via admin)
 *   CHECKOUT.ORDER.APPROVED     → (no action; capture happens in confirm route)
 */
export async function POST(req: NextRequest) {
  // ── Rate-limit ───────────────────────────────────────────────────────────────
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`paypal-webhook:${ip}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // ── Signature verification ───────────────────────────────────────────────────
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId && process.env.NODE_ENV === "production") {
    console.error("[PAYPAL WEBHOOK] PAYPAL_WEBHOOK_ID is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();

  // Verify PayPal signature when PAYPAL_WEBHOOK_ID is configured
  if (webhookId) {
    const verified = await verifyPayPalSignature(req, rawBody, webhookId);
    if (!verified) {
      console.error("[PAYPAL WEBHOOK] Signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event_type: eventType, id: webhookEventId, resource } = event;

  try {
    // ── PAYMENT.CAPTURE.COMPLETED ────────────────────────────────────────────
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      await connectDB();

      // Idempotency guard — skip if already processed
      const alreadyProcessed = await Payment.findOne({ webhookEventId }).lean();
      if (alreadyProcessed) {
        console.log(`[PAYPAL WEBHOOK] Duplicate event ${webhookEventId} — skipping`);
        return NextResponse.json({ received: true, duplicate: true });
      }

      const supplementary = resource?.supplementary_data as { related_ids?: { order_id?: string } } | undefined;
      const orderId  = supplementary?.related_ids?.order_id;
      const customId = resource?.custom_id as string | undefined;

      if (!orderId) {
        console.warn("[PAYPAL WEBHOOK] PAYMENT.CAPTURE.COMPLETED missing order_id", resource);
        return NextResponse.json({ received: true, warning: "no order_id" });
      }

      // Parse metadata stored as custom_id on the purchase unit
      let metadata: Record<string, string> = {};
      if (customId) {
        try { metadata = JSON.parse(customId) as Record<string, string>; }
        catch { /* ignore parse errors */ }
      }

      console.log(`[PAYPAL WEBHOOK] PAYMENT.CAPTURE.COMPLETED orderId=${orderId} metadata=`, metadata);

      // ── Business subscription ──────────────────────────────────────────────
      if (metadata.type === "subscription" && metadata.orgId && metadata.plan) {
        if (!isValidObjectId(metadata.orgId)) {
          console.error("[PAYPAL WEBHOOK] Invalid orgId in subscription metadata");
          return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
        }
        // Only update if not already activated (the confirm route may have already done it)
        const org = await businessOrganizationRepository.findById(metadata.orgId);
        if (org && org.planStatus !== "active") {
          const now     = new Date();
          const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          await businessOrganizationRepository.updateById(metadata.orgId, {
            $set: {
              plan:                 metadata.plan as BusinessPlan,
              planStatus:           "active",
              planActivatedAt:      now,
              planExpiresAt:        expires,
              pendingPlanSessionId: null,
              pendingPlan:          null,
            },
          });
          console.log(`[PAYPAL WEBHOOK] Subscription '${metadata.plan}' activated via webhook for org ${metadata.orgId}`);
        }
      }

      // ── Agency billing (handled by confirm route; this is a fallback) ──────
      // Other payment types (escrow, wallet) don't use PayPal in this platform;
      // they use PayMongo. Log and acknowledge.
      if (!metadata.type) {
        console.log(`[PAYPAL WEBHOOK] Untyped capture event orderId=${orderId} — no action taken`);
      }
    }

    // ── PAYMENT.CAPTURE.REFUNDED ─────────────────────────────────────────────
    if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      const captureId = resource?.id as string | undefined;
      console.log(`[PAYPAL WEBHOOK] PAYMENT.CAPTURE.REFUNDED captureId=${captureId ?? "unknown"} — refund already processed via admin panel`);
    }

    // ── CHECKOUT.ORDER.APPROVED ──────────────────────────────────────────────
    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      // No action needed: capture happens in the /confirm route when user returns.
      console.log("[PAYPAL WEBHOOK] CHECKOUT.ORDER.APPROVED — capture handled by confirm route");
    }

  } catch (err) {
    console.error("[PAYPAL WEBHOOK] Processing error:", err);
    // Return 500 so PayPal retries delivery
    return NextResponse.json({ received: false, error: "Processing error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── PayPal signature verification ───────────────────────────────────────────

async function verifyPayPalSignature(
  req: NextRequest,
  rawBody: string,
  webhookId: string
): Promise<boolean> {
  const base        = process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  const clientId     = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[PAYPAL WEBHOOK] Missing PayPal credentials for signature verification");
    return false;
  }

  try {
    // Get access token
    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method:  "POST",
      headers: {
        Authorization:  "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body:  "grant_type=client_credentials",
      cache: "no-store",
    });
    const tokenData = await tokenRes.json() as { access_token?: string };
    if (!tokenData.access_token) return false;

    // Verify signature via PayPal v1 API
    // Verify signature via PayPal v1 API
    // H-1: Validate cert_url domain before forwarding — prevents SSRF / cert-swap
    const certUrl = req.headers.get("paypal-cert-url") ?? "";
    const ALLOWED_CERT_ORIGINS = [
      "https://api.paypal.com/",
      "https://api-m.paypal.com/",
      "https://api.sandbox.paypal.com/",
      "https://api-m.sandbox.paypal.com/",
    ];
    if (!ALLOWED_CERT_ORIGINS.some((o) => certUrl.startsWith(o))) {
      console.error("[PAYPAL WEBHOOK] cert_url domain rejected:", certUrl);
      return false;
    }

    const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo:         req.headers.get("paypal-auth-algo"),
        cert_url:          certUrl,
        transmission_id:   req.headers.get("paypal-transmission-id"),
        transmission_sig:  req.headers.get("paypal-transmission-sig"),
        transmission_time: req.headers.get("paypal-transmission-time"),
        webhook_id:        webhookId,
        webhook_event:     JSON.parse(rawBody),
      }),
    });

    const verifyData = await verifyRes.json() as { verification_status?: string };
    return verifyData.verification_status === "SUCCESS";
  } catch (err) {
    console.error("[PAYPAL WEBHOOK] Signature verification request failed:", err);
    return false;
  }
}

// ─── PayPal webhook event types ───────────────────────────────────────────────

interface PayPalWebhookEvent {
  id:         string;
  event_type: string;
  resource?:  Record<string, unknown>;
}
