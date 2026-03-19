/**
 * Twilio helper — OTP (Verify API) + outbound SMS (Messages API).
 *
 * Uses the official Twilio Node.js SDK.
 *
 * Required environment variables:
 *   TWILIO_ACCOUNT_SID        – Your Twilio Account SID
 *   TWILIO_AUTH_TOKEN         – Your Twilio Auth Token
 *   TWILIO_VERIFY_SERVICE_SID – Verify Service SID (starts with VA...)
 *   TWILIO_PHONE_NUMBER       – The Twilio number to send from (e.g. +1234567890)
 */

import twilio from "twilio";
import { createLogger } from "@/lib/logger";

const log = createLogger("sms");

const SID     = process.env.TWILIO_ACCOUNT_SID;
const TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const SERVICE = process.env.TWILIO_VERIFY_SERVICE_SID;
const FROM    = process.env.TWILIO_PHONE_NUMBER;

function getClient() {
  if (!SID || !TOKEN) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
    );
  }
  return twilio(SID, TOKEN);
}

/**
 * Start a Verify flow — Twilio sends a 6-digit OTP to the given number.
 */
export async function sendOtp(toPhone: string): Promise<void> {
  if (!SERVICE) {
    throw new Error("TWILIO_VERIFY_SERVICE_SID is not set.");
  }
  const client = getClient();
  await client.verify.v2.services(SERVICE).verifications.create({
    to: toPhone,
    channel: "sms",
  });
}

/**
 * Check an OTP code via Twilio Verify.
 * Returns true if approved, false if incorrect/expired.
 */
export async function checkOtp(toPhone: string, code: string): Promise<boolean> {
  if (!SERVICE) {
    throw new Error("TWILIO_VERIFY_SERVICE_SID is not set.");
  }
  const client = getClient();
  try {
    const check = await client.verify.v2.services(SERVICE).verificationChecks.create({
      to: toPhone,
      code,
    });
    return check.status === "approved";
  } catch {
    return false; // expired or not found
  }
}

/**
 * Send a free-form SMS via the Twilio Messages API.
 * Non-blocking — errors are logged and swallowed so they never break a request.
 */
export async function sendSms(toPhone: string, body: string): Promise<void> {
  if (!SID || !TOKEN) {
    log.warn("Twilio credentials not configured — skipping SMS.");
    return;
  }
  if (!FROM) {
    log.warn("TWILIO_PHONE_NUMBER not set — skipping SMS.");
    return;
  }
  try {
    const client = getClient();
    const message = await client.messages.create({
      body,
      from: FROM,
      to:   toPhone,
    });
    log.info({ to: toPhone, sid: message.sid }, "SMS sent");
  } catch (err) {
    log.error({ err, to: toPhone }, "Failed to send SMS");
  }
}
