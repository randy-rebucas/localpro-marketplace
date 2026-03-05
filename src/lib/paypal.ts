/**
 * PayPal REST API v2 client.
 * Docs: https://developer.paypal.com/docs/api/orders/v2/
 *
 * Set environment variables:
 *   PAYPAL_CLIENT_ID      — App client ID (sandbox or live)
 *   PAYPAL_CLIENT_SECRET  — App client secret
 *   NEXT_PUBLIC_PAYPAL_MODE — "sandbox" | "live"  (defaults to "sandbox")
 */

const PAYPAL_BASE =
  process.env.NEXT_PUBLIC_PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId     = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set");
  }

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const json = (await res.json()) as {
    access_token?: string;
    error_description?: string;
  };

  if (!res.ok) {
    throw new Error(
      json.error_description ?? `PayPal auth error ${res.status}`
    );
  }

  return json.access_token!;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept:         "application/json",
    },
    body:  body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) {
    type PayPalError = {
      message?: string;
      details?: { description: string }[];
    };
    const e      = json as PayPalError;
    const detail =
      e.details?.[0]?.description ?? e.message ?? `PayPal error ${res.status}`;
    throw new Error(detail);
  }

  return json as T;
}

// ─── Orders API ───────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  /** Amount in PHP (Philippine Peso) */
  amountPHP:   number;
  description: string;
  successUrl:  string;
  cancelUrl:   string;
  /** Arbitrary key/value stored as custom_id on each purchase unit */
  metadata:    Record<string, string>;
}

export interface OrderData {
  id:         string;
  approveUrl: string;
  status:     string;
}

/**
 * Creates a PayPal order (intent=CAPTURE).
 * Returns the order ID and the URL to redirect the user to for approval.
 */
export async function createOrder(
  input: CreateOrderInput
): Promise<OrderData> {
  const res = await request<{
    id:     string;
    status: string;
    links:  { rel: string; href: string }[];
  }>("POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        description: input.description,
        custom_id:   JSON.stringify(input.metadata),
        amount: {
          currency_code: "PHP",
          value:          input.amountPHP.toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name:          "LocalPro",
      landing_page:        "LOGIN",
      user_action:         "PAY_NOW",
      shipping_preference: "NO_SHIPPING",
      return_url:          input.successUrl,
      cancel_url:          input.cancelUrl,
    },
  });

  const approveUrl =
    res.links.find((l) => l.rel === "approve")?.href ?? "";

  return { id: res.id, approveUrl, status: res.status };
}

export interface CaptureResult {
  orderId:   string;
  /** "COMPLETED" on success */
  status:    string;
  metadata:  Record<string, string>;
  captureId: string | null;
}

/**
 * Captures (charges) an approved PayPal order.
 * Returns the capture status and the metadata stored at order creation.
 */
export async function captureOrder(orderId: string): Promise<CaptureResult> {
  const res = await request<{
    id:    string;
    status: string;
    purchase_units: {
      custom_id?: string;
      payments?: {
        captures?: { id: string; status: string }[];
      };
    }[];
  }>("POST", `/v2/checkout/orders/${orderId}/capture`, {});

  const unit      = res.purchase_units[0];
  const customId  = unit?.custom_id ?? "{}";
  let   metadata: Record<string, string> = {};

  try { metadata = JSON.parse(customId) as Record<string, string>; }
  catch { /* ignore parse errors */ }

  const captureId = unit?.payments?.captures?.[0]?.id ?? null;

  return { orderId: res.id, status: res.status, metadata, captureId };
}

/**
 * Fetches a PayPal order by ID to check its status.
 * Used to verify payment without re-capturing.
 */
export async function getOrder(
  orderId: string
): Promise<{ status: string; metadata: Record<string, string> }> {
  const res = await request<{
    id:             string;
    status:         string;
    purchase_units: { custom_id?: string }[];
  }>("GET", `/v2/checkout/orders/${orderId}`);

  const customId = res.purchase_units[0]?.custom_id ?? "{}";
  let   metadata: Record<string, string> = {};

  try { metadata = JSON.parse(customId) as Record<string, string>; }
  catch { /* ignore */ }

  return { status: res.status, metadata };
}
