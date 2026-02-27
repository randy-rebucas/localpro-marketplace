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
  status: string;
  referenceNumber: string;
  paymentIntentId: string | null;
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
        payment_intent: { id: string } | null;
      };
    };
  }>("GET", `/checkout_sessions/${id}`);

  return {
    id: res.data.id,
    checkoutUrl: res.data.attributes.checkout_url,
    status: res.data.attributes.status,
    referenceNumber: res.data.attributes.reference_number,
    paymentIntentId: res.data.attributes.payment_intent?.id ?? null,
  };
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
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=") as [string, string])
  );
  const timestamp = parts.t;
  const isTest = process.env.NODE_ENV !== "production";
  const sig = isTest ? parts.te : parts.li;

  if (!timestamp || !sig) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}
