/**
 * Twilio Verify helper for phone OTP authentication.
 *
 * Uses the Twilio Verify API (recommended for OTPs) rather than the raw
 * Messages API, so Twilio manages code generation, expiry, and retry logic.
 *
 * Required environment variables:
 *   TWILIO_ACCOUNT_SID        – Your Twilio Account SID
 *   TWILIO_AUTH_TOKEN         – Your Twilio Auth Token
 *   TWILIO_VERIFY_SERVICE_SID – Verify Service SID (starts with VA...)
 *
 * Optional (required for outbound SMS):
 *   TWILIO_PHONE_NUMBER       – The Twilio number to send from (e.g. +1234567890)
 */

const SID        = process.env.TWILIO_ACCOUNT_SID;
const TOKEN      = process.env.TWILIO_AUTH_TOKEN;
const SERVICE    = process.env.TWILIO_VERIFY_SERVICE_SID;

function auth() {
  if (!SID || !TOKEN || !SERVICE) {
    throw new Error(
      "Twilio Verify is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID."
    );
  }
  return Buffer.from(`${SID}:${TOKEN}`).toString("base64");
}

/**
 * Start a Verify flow — Twilio sends a 6-digit OTP to the given number.
 */
export async function sendOtp(toPhone: string): Promise<void> {
  const base64 = auth();
  const url = `https://verify.twilio.com/v2/Services/${SERVICE}/Verifications`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":  "application/x-www-form-urlencoded",
      Authorization:   `Basic ${base64}`,
    },
    body: new URLSearchParams({ To: toPhone, Channel: "sms" }).toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Twilio Verify error ${res.status}: ${JSON.stringify(err)}`);
  }
}

/**
 * Check an OTP code via Twilio Verify.
 * Returns true if approved, false if incorrect/expired.
 */
export async function checkOtp(toPhone: string, code: string): Promise<boolean> {
  const base64 = auth();
  const url = `https://verify.twilio.com/v2/Services/${SERVICE}/VerificationChecks`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":  "application/x-www-form-urlencoded",
      Authorization:   `Basic ${base64}`,
    },
    body: new URLSearchParams({ To: toPhone, Code: code }).toString(),
  });

  if (res.status === 404) return false; // expired or not found

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Twilio Verify check error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = (await res.json()) as { status: string };
  return data.status === "approved";
}

/**
 * Send a free-form SMS via the Twilio Messages REST API.
 * Requires TWILIO_PHONE_NUMBER to be set (the sender number).
 * Non-blocking — errors are logged and swallowed so they never break a request.
 */
export async function sendSms(toPhone: string, body: string): Promise<void> {
  if (!SID || !TOKEN) {
    console.warn("[SMS] Twilio credentials not configured — skipping SMS.");
    return;
  }

  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    console.warn("[SMS] TWILIO_PHONE_NUMBER not set — skipping SMS.");
    return;
  }

  const authHeader = `Basic ${Buffer.from(`${SID}:${TOKEN}`).toString("base64")}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: authHeader,
      },
      body: new URLSearchParams({ To: toPhone, From: from, Body: body }).toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[SMS] Twilio Messages error ${res.status}:`, err);
    }
  } catch (err) {
    console.error("[SMS] Failed to send SMS:", err);
  }
}
