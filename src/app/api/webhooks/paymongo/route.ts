import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paymongo";
import { paymentService } from "@/services";

/**
 * POST /api/webhooks/paymongo
 *
 * Receives PayMongo webhook events.
 * Register this URL in the PayMongo dashboard → Webhooks.
 *
 * Events handled:
 *   checkout_session.payment.paid  → fund escrow, notify parties
 *   payment_intent.succeeded       → (legacy) fund escrow, notify parties
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("Paymongo-Signature") ?? "";

  // In production the webhook secret MUST be configured.
  // In development without a secret, we allow unsigned requests for local testing only.
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret && process.env.NODE_ENV === "production") {
    console.error("[PAYMONGO WEBHOOK] PAYMONGO_WEBHOOK_SECRET is not set in production");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  if (webhookSecret) {
    const valid = verifyWebhookSignature(rawBody, signature);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: {
    data: {
      attributes: {
        type: string;
        data: {
          id: string;
          attributes: {
            status?: string;
            payment_intent?: { id: string } | null;
            payments?: Array<{
              id: string;
              attributes: { status: string; source?: { type: string } };
            }>;
          };
        };
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.data.attributes.type;
  const resourceData = event.data.attributes.data;

  try {
    // ── Checkout Session paid ────────────────────────────────────────────────
    if (eventType === "checkout_session.payment.paid") {
      const sessionId = resourceData.id;
      const paymentIntentId = resourceData.attributes.payment_intent?.id ?? "";
      await paymentService.confirmEscrowFunding(sessionId, paymentIntentId, "checkout");
    }

    // ── Legacy Payment Intent succeeded ─────────────────────────────────────
    if (eventType === "payment_intent.succeeded") {
      const intentId = resourceData.id;
      const payments = resourceData.attributes.payments ?? [];
      const successfulPayment = payments.find((p) => p.attributes.status === "paid");
      await paymentService.confirmEscrowFunding(
        intentId,
        successfulPayment?.id ?? "",
        successfulPayment?.attributes.source?.type ?? "unknown"
      );
    }
  } catch (err) {
    console.error("[PAYMONGO WEBHOOK]", err);
    // Return 500 so PayMongo retries on processing errors
    return NextResponse.json({ received: false, error: "Processing error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
