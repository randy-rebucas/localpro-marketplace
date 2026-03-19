import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paymongo";
import { paymentService } from "@/services";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { businessOrganizationRepository } from "@/repositories";
import { walletService } from "@/services/wallet.service";
import type { BusinessPlan } from "@/types";
import { isValidObjectId } from "mongoose";
import { createLogger } from "@/lib/logger";

const log = createLogger("paymongo-webhook");

/**
 * POST /api/webhooks/paymongo
 *
 * Receives PayMongo webhook events.
 * Register this URL in the PayMongo dashboard → Webhooks.
 *
 * Events handled:
 *   checkout_session.payment.paid  → fund escrow, notify parties
 *   payment_intent.succeeded       → (legacy) fund escrow, notify parties
 *   payment.failed                 → mark payment failed, notify client
 *   checkout_session.payment.expired → mark payment failed, notify client
 */
export async function POST(req: NextRequest) {
  // Rate-limit: 60 webhook deliveries per minute per source IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`webhook:${ip}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("Paymongo-Signature") ?? "";

  // In production the webhook secret MUST be configured.
  // In development without a secret, we allow unsigned requests for local testing only.
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret && process.env.NODE_ENV === "production") {
    log.error("PAYMONGO_WEBHOOK_SECRET is not set in production");
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
      id: string;  // PayMongo webhook event ID — used for idempotency
      attributes: {
        type: string;
        data: {
          id: string;
          attributes: {
            status?: string;
            /** Confirmed amount charged by PayMongo in centavos — authoritative */
            amount?: number;
            payment_intent?: { id: string } | null;
            metadata?: Record<string, string>;
            payments?: Array<{
              id: string;
              attributes: {
                status: string;
                source?: { id: string; type: string };
              };
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

  const eventType    = event.data.attributes.type;
  const resourceData = event.data.attributes.data;
  const webhookEventId = event.data.id ?? "";  // Idempotency key

  try {
    // ── Checkout Session paid ────────────────────────────────────────────────
    if (eventType === "checkout_session.payment.paid") {
      const metadata = resourceData.attributes.metadata ?? {};

      // ── Idempotency guard — skip if this exact webhook event was already processed
      if (webhookEventId) {
        await connectDB();
        const alreadyProcessed = await Payment.findOne({ webhookEventId }).lean();
        if (alreadyProcessed) {
          log.info({ webhookEventId }, "Duplicate event — skipping");
          return NextResponse.json({ received: true, duplicate: true });
        }
      }

      // ── Branch A: subscription plan upgrade ───────────────────────────────
      if (metadata.type === "subscription" && metadata.orgId && metadata.plan) {
        // H13: validate orgId is a real ObjectId before using in DB query
        if (!isValidObjectId(metadata.orgId)) {
          log.error({ orgId: metadata.orgId }, "Invalid orgId in subscription metadata");
          return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
        }
        const now = new Date();
        const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await businessOrganizationRepository.updateById(metadata.orgId, {
          $set: {
            plan:                metadata.plan as BusinessPlan,
            planStatus:          "active",
            planActivatedAt:     now,
            planExpiresAt:       expires,
            pendingPlanSessionId: null,
            pendingPlan:         null,
          },
        });
        log.info({ plan: metadata.plan, orgId: metadata.orgId }, "Subscription plan activated");

      // ── Branch B: wallet top-up ───────────────────────────────────────────
      } else if (metadata.type === "wallet_topup" && metadata.userId) {
        // H13: validate userId
        if (!isValidObjectId(metadata.userId)) {
          log.error({ userId: metadata.userId }, "Invalid userId in wallet_topup metadata");
          return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
        }
        const sessionId = resourceData.id;
        // M-6: Use confirmed centavo amount from event (authoritative), not client-supplied metadata
        const confirmedCentavosB = Number(resourceData.attributes.amount ?? 0);
        if (confirmedCentavosB <= 0) {
          log.error({ sessionId }, "wallet_topup: no confirmed amount in event");
          return NextResponse.json({ error: "No confirmed amount" }, { status: 400 });
        }
        const amountPHP = confirmedCentavosB / 100;
        const metaAmtB = parseFloat(metadata.amountPHP ?? "0");
        if (metaAmtB > 0 && Math.abs(amountPHP - metaAmtB) > 0.01) {
          log.error({ confirmed: amountPHP, metadata: metaAmtB, sessionId }, "wallet_topup amount mismatch");
          return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
        }
        await walletService.topUpConfirm(
          metadata.userId,
          amountPHP,
          sessionId,
          metadata.userId
        );
        log.info({ amountPHP, userId: metadata.userId, sessionId }, "Wallet top-up confirmed");

      // ── Branch D: featured listing boost ──────────────────────────────────
      } else if (metadata.type === "featured_listing" && metadata.providerId && metadata.listingType) {
        // H13: validate providerId
        if (!isValidObjectId(metadata.providerId)) {
          log.error({ providerId: metadata.providerId }, "Invalid providerId in featured_listing metadata");
          return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
        }
        const sessionId = resourceData.id;
        // M-6: Use confirmed centavo amount from PayMongo event (authoritative, not client metadata)
        const confirmedCentavosD = Number(resourceData.attributes.amount ?? 0);
        if (confirmedCentavosD <= 0) {
          log.error({ sessionId }, "featured_listing: no confirmed amount");
          return NextResponse.json({ error: "No confirmed amount" }, { status: 400 });
        }
        const amountPHPD = confirmedCentavosD / 100;
        const metaAmtD = parseFloat(metadata.amountPHP ?? "0");
        if (metaAmtD > 0 && Math.abs(amountPHPD - metaAmtD) > 0.01) {
          log.error({ confirmed: amountPHPD, metadata: metaAmtD, sessionId }, "featured_listing amount mismatch");
          return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
        }
        const { featuredListingService } = await import("@/services/featured-listing.service");
        await featuredListingService.activateFromWebhook(
          metadata.providerId,
          metadata.listingType as import("@/types").FeaturedListingType,
          sessionId,
          amountPHPD
        );
        log.info({ listingType: metadata.listingType, providerId: metadata.providerId, sessionId }, "Featured listing activated");

      // ── Branch E: training course enrollment ──────────────────────────────
      } else if (metadata.type === "training" && metadata.providerId && metadata.courseId) {
        // H13: validate providerId and courseId
        if (!isValidObjectId(metadata.providerId) || !isValidObjectId(metadata.courseId)) {
          log.error({ providerId: metadata.providerId, courseId: metadata.courseId }, "Invalid providerId/courseId in training metadata");
          return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
        }
        const sessionId = resourceData.id;
        // M-6: Use confirmed centavo amount from PayMongo event (authoritative)
        const confirmedCentavosE = Number(resourceData.attributes.amount ?? 0);
        if (confirmedCentavosE <= 0) {
          log.error({ sessionId }, "training: no confirmed amount");
          return NextResponse.json({ error: "No confirmed amount" }, { status: 400 });
        }
        const amountPHPE = confirmedCentavosE / 100;
        const metaAmtE = parseFloat(metadata.amountPHP ?? "0");
        if (metaAmtE > 0 && Math.abs(amountPHPE - metaAmtE) > 0.01) {
          log.error({ confirmed: amountPHPE, metadata: metaAmtE, sessionId }, "training amount mismatch");
          return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
        }
        const { trainingService } = await import("@/services/training.service");
        await trainingService.activateFromWebhook(
          metadata.providerId,
          metadata.courseId,
          sessionId,
          amountPHPE
        );
        log.info({ providerId: metadata.providerId, courseId: metadata.courseId, sessionId }, "Training enrollment activated");

      // ── Branch C: escrow job payment ─────────────────────────────────────
      } else {
        const sessionId = resourceData.id;
        const paymentIntentId = resourceData.attributes.payment_intent?.id ?? "";
        await paymentService.confirmEscrowFunding(sessionId, paymentIntentId, "checkout");

        // Stamp webhookEventId so duplicate deliveries are caught above
        if (webhookEventId) {
          await connectDB();
          await Payment.findOneAndUpdate(
            { paymentIntentId: sessionId },
            { webhookEventId },
          );
        }

        // Save card PM for future recurring auto-pay
        const payments = resourceData.attributes.payments ?? [];
        const cardPayment = payments.find(
          (p) => p.attributes.status === "paid" && p.attributes.source?.type === "card"
        );
        const pmId = cardPayment?.attributes.source?.id;
        const clientId = metadata.clientId;

        if (pmId && clientId) {
          try {
            const { getPaymentMethodDetails } = await import("@/lib/paymongo");
            const details = await getPaymentMethodDetails(pmId);
            if (details) {
              await connectDB();
              await User.findByIdAndUpdate(clientId, {
                savedPaymentMethodId:    details.paymentMethodId,
                savedPaymentMethodLast4: details.last4,
                savedPaymentMethodBrand: details.brand,
              });
              log.info({ pmId, clientId }, "Saved card payment method");
            }
          } catch (err) {
            log.error({ err, pmId, clientId }, "Failed to save payment method");
          }
        }
      }
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

    // ── Payment failed ───────────────────────────────────────────────────────
    if (eventType === "payment.failed") {
      const intentId: string =
        (resourceData.attributes as Record<string, unknown>).payment_intent_id as string ?? resourceData.id;
      await paymentService.handlePaymentFailed(intentId);
    }

    // ── Checkout session expired without payment ─────────────────────────────
    if (eventType === "checkout_session.payment.expired") {
      const intentId = resourceData.attributes.payment_intent?.id ?? resourceData.id;
      await paymentService.handlePaymentFailed(intentId);
    }
  } catch (err) {
    log.error({ err }, "Webhook processing error");
    // Return 500 so PayMongo retries on processing errors
    return NextResponse.json({ received: false, error: "Processing error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
