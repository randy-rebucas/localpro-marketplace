/**
 * PayMongo REST API client (PH payment gateway).
 * Docs: https://developers.paymongo.com
 *
 * Set environment variables:
 *   PAYMONGO_SECRET_KEY   — sk_test_xxx  or  sk_live_xxx
 *   PAYMONGO_WEBHOOK_SECRET — from PayMongo dashboard webhook settings
 */

import crypto from "crypto";

const BASE_URL = "https://api.paymongo.com/v1";

function authHeader(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not set");
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) {
    const detail = (json as { errors?: { detail: string }[] }).errors?.[0]?.detail;
    throw new Error(detail ?? `PayMongo error ${res.status}`);
  }
  return json as T;
}

// ─── Payment Intents ──────────────────────────────────────────────────────────

export type PaymentMethodType = "gcash" | "paymaya" | "card" | "dob" | "billease";

export interface CreatePaymentIntentInput {
  /** Amount in PHP (will be converted to centavos internally) */
  amountPHP: number;
  currency?: string;
  description?: string;
  paymentMethods?: PaymentMethodType[];
  metadata?: Record<string, string>;
}

export interface PaymentIntentData {
  id: string;
  clientKey: string;
  status: string;
  amountCentavos: number;
  currency: string;
}

export async function createPaymentIntent(
  input: CreatePaymentIntentInput
): Promise<PaymentIntentData> {
  const amountCentavos = Math.round(input.amountPHP * 100);

  const res = await request<{
    data: {
      id: string;
      attributes: { client_key: string; status: string; amount: number; currency: string };
    };
  }>("POST", "/payment_intents", {
    data: {
      attributes: {
        amount: amountCentavos,
        currency: input.currency ?? "PHP",
        description: input.description,
        payment_method_allowed: input.paymentMethods ?? [
          "gcash",
          "paymaya",
          "card",
        ],
        payment_method_options: {
          card: { request_three_d_secure: "any" },
        },
        capture_type: "automatic",
        metadata: input.metadata ?? {},
      },
    },
  });

  return {
    id: res.data.id,
    clientKey: res.data.attributes.client_key,
    status: res.data.attributes.status,
    amountCentavos: res.data.attributes.amount,
    currency: res.data.attributes.currency,
  };
}

export async function getPaymentIntent(id: string): Promise<PaymentIntentData> {
  const res = await request<{
    data: { id: string; attributes: { client_key: string; status: string; amount: number; currency: string } };
  }>("GET", `/payment_intents/${id}`);

  return {
    id: res.data.id,
    clientKey: res.data.attributes.client_key,
    status: res.data.attributes.status,
    amountCentavos: res.data.attributes.amount,
    currency: res.data.attributes.currency,
  };
}

// ─── Checkout Sessions ────────────────────────────────────────────────────────

export interface CreateCheckoutSessionInput {
  /** Amount in PHP */
  amountPHP: number;
  description: string;
  /** Shown on the checkout page */
  lineItemName: string;
  /** URL to redirect after successful payment */
  successUrl: string;
  /** URL to redirect on cancellation */
  cancelUrl: string;
  metadata?: Record<string, string>;
  paymentMethods?: PaymentMethodType[];
}

export interface CheckoutSessionData {
  id: string;
  checkoutUrl: string;
  /** Session lifecycle status: "active" | "expired" (never "paid") */
  status: string;
  referenceNumber: string;
  paymentIntentId: string | null;
  /** Resolved payment intent status: "succeeded" | "awaiting_payment_method" | etc. */
  paymentIntentStatus: string | null;
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<CheckoutSessionData> {
  const amountCentavos = Math.round(input.amountPHP * 100);

  const res = await request<{
    data: {
      id: string;
      attributes: {
        checkout_url: string;
        status: string;
        reference_number: string;
        payment_intent: { id: string } | null;
      };
    };
  }>("POST", "/checkout_sessions", {
    data: {
      attributes: {
        billing: null,
        send_email_receipt: false,
        show_description: true,
        show_line_items: true,
        cancel_url: input.cancelUrl,
        success_url: input.successUrl,
        description: input.description,
        payment_method_types: input.paymentMethods ?? ["gcash", "paymaya", "card"],
        line_items: [
          {
            currency: "PHP",
            amount: amountCentavos,
            description: input.description,
            name: input.lineItemName,
            quantity: 1,
          },
        ],
        metadata: input.metadata ?? {},
      },
    },
  });

  return {
    id: res.data.id,
    checkoutUrl: res.data.attributes.checkout_url,
    status: res.data.attributes.status,
    referenceNumber: res.data.attributes.reference_number,
    paymentIntentId: res.data.attributes.payment_intent?.id ?? null,
    paymentIntentStatus: null, // not available at creation time
  };
}

export async function getCheckoutSession(id: string): Promise<CheckoutSessionData> {
  const res = await request<{
    data: {
      id: string;
      attributes: {
        checkout_url: string;
        status: string;
        reference_number: string;
        // PayMongo may return either just the id or the full expanded object
        payment_intent: { id: string; attributes?: { status: string } } | null;
      };
    };
  }>("GET", `/checkout_sessions/${id}`);

  const pi = res.data.attributes.payment_intent;

  return {
    id: res.data.id,
    checkoutUrl: res.data.attributes.checkout_url,
    status: res.data.attributes.status,
    referenceNumber: res.data.attributes.reference_number,
    paymentIntentId: pi?.id ?? null,
    paymentIntentStatus: pi?.attributes?.status ?? null,
  };
}

// ─── Saved Payment Method (Card) — Off-Session Charging ──────────────────────

export interface SavedPaymentMethodInfo {
  /** PayMongo payment_method ID (pm_xxx) */
  paymentMethodId: string;
  /** Last 4 digits of the card */
  last4: string;
  /** Card brand: "visa" | "mastercard" | etc. */
  brand: string;
  /** Expiry month 1–12 */
  expMonth: number;
  /** Expiry year (4-digit) */
  expYear: number;
}

export interface AutoChargeResult {
  /** true = charged successfully; false = needs 3DS or failed */
  success: boolean;
  /** Payment intent ID on success */
  paymentIntentId?: string;
  /** Human-readable reason when success=false */
  reason?: string;
}

/**
 * Attempts to charge a stored card payment method server-side (off-session).
 * Works for card PMs that were collected in a prior checkout session.
 * GCash / PayMaya cannot be charged off-session — those require a new user redirect.
 *
 * Returns `success: false` with a reason when 3DS authentication is required
 * or the charge fails, so the caller can fall back to a notification prompt.
 */
export async function chargeWithSavedMethod(
  paymentMethodId: string,
  amountPHP: number,
  description: string,
  metadata?: Record<string, string>
): Promise<AutoChargeResult> {
  // 1. Create the payment intent
  const amountCentavos = Math.round(amountPHP * 100);

  let piRes: {
    data: { id: string; attributes: { client_key: string; status: string } };
  };

  try {
    piRes = await request<typeof piRes>("POST", "/payment_intents", {
      data: {
        attributes: {
          amount: amountCentavos,
          currency: "PHP",
          description,
          payment_method_allowed: ["card"],
          payment_method_options: { card: { request_three_d_secure: "any" } },
          capture_type: "automatic",
          metadata: metadata ?? {},
        },
      },
    });
  } catch (err) {
    return {
      success: false,
      reason: `Failed to create payment intent: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const piId = piRes.data.id;
  const clientKey = piRes.data.attributes.client_key;

  // 2. Attach the saved payment method (off-session)
  let attachRes: {
    data: {
      id: string;
      attributes: {
        status: string;
        next_action?: { type: string } | null;
      };
    };
  };

  try {
    attachRes = await request<typeof attachRes>(
      "POST",
      `/payment_intents/${piId}/attach`,
      {
        data: {
          attributes: {
            payment_method: paymentMethodId,
            client_key: clientKey,
          },
        },
      }
    );
  } catch (err) {
    return {
      success: false,
      reason: `Failed to attach payment method: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const status = attachRes.data.attributes.status;
  const nextAction = attachRes.data.attributes.next_action;

  if (status === "succeeded") {
    return { success: true, paymentIntentId: piId };
  }

  if (nextAction?.type === "redirect") {
    // 3DS required — cannot complete server-side
    return { success: false, reason: "3DS authentication required" };
  }

  return {
    success: false,
    reason: `Payment intent status: ${status}`,
  };
}

/**
 * Retrieves the last-4, brand, and expiry from a payment method ID.
 * Returns null if the PM is not found or is not a card.
 */
export async function getPaymentMethodDetails(
  paymentMethodId: string
): Promise<SavedPaymentMethodInfo | null> {
  try {
    const res = await request<{
      data: {
        id: string;
        attributes: {
          type: string;
          details?: {
            last4?: string;
            brand?: string;
            exp_month?: number;
            exp_year?: number;
          };
        };
      };
    }>("GET", `/payment_methods/${paymentMethodId}`);

    if (res.data.attributes.type !== "card") return null;
    const d = res.data.attributes.details;
    if (!d?.last4) return null;

    return {
      paymentMethodId,
      last4: d.last4,
      brand: d.brand ?? "card",
      expMonth: d.exp_month ?? 0,
      expYear: d.exp_year ?? 0,
    };
  } catch {
    return null;
  }
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

export type RefundReason = "duplicate" | "fraudulent" | "requested_by_customer";

export interface CreateRefundInput {
  /** PayMongo payment ID (pay_xxx) attached to the payment intent */
  paymentId: string;
  /** Amount in PHP */
  amountPHP: number;
  reason: RefundReason;
  notes?: string;
}

export interface RefundData {
  id: string;
  status: string;
  amountCentavos: number;
}

export async function createRefund(input: CreateRefundInput): Promise<RefundData> {
  const res = await request<{
    data: { id: string; attributes: { status: string; amount: number } };
  }>("POST", "/refunds", {
    data: {
      attributes: {
        payment_id: input.paymentId,
        amount: Math.round(input.amountPHP * 100),
        reason: input.reason,
        notes: input.notes,
      },
    },
  });

  return {
    id: res.data.id,
    status: res.data.attributes.status,
    amountCentavos: res.data.attributes.amount,
  };
}

// ─── Webhook Signature Verification ──────────────────────────────────────────

/**
 * Verifies the Paymongo-Signature header.
 * Header format: t=<timestamp>,te=<test_sig>,li=<live_sig>
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  // Trim to remove accidental trailing whitespace from .env inline comments
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET?.trim();
  if (!secret) return false;

  // Split each "key=value" pair on the FIRST "=" only
  const parts: Record<string, string> = {};
  for (const segment of signatureHeader.split(",")) {
    const idx = segment.indexOf("=");
    if (idx === -1) continue;
    parts[segment.slice(0, idx)] = segment.slice(idx + 1);
  }

  const timestamp = parts.t;
  const isTest = process.env.NODE_ENV !== "production";
  const sig = isTest ? parts.te : parts.li;

  if (!timestamp || !sig) {
    console.error("[PAYMONGO] Missing timestamp or sig in header:", signatureHeader);
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(sig, "utf8")
    );
  } catch (err) {
    console.error("[PAYMONGO] timingSafeEqual failed:", err);
    return false;
  }
}
