import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services";
import { setAuthCookies } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, UnprocessableError } from "@/lib/errors";
import { getAppSetting } from "@/lib/appSettings";
import { checkRateLimit } from "@/lib/rateLimit";
import { loyaltyRepository } from "@/repositories/loyalty.repository";
import { sendReferralRegistrationEmail } from "@/lib/email";
import User from "@/models/User";
import { RegisterSchema } from "@/lib/validation";

// 5 registrations per 15 minutes per IP
const REGISTER_LIMIT = { windowMs: 15 * 60_000, max: 5 };

export const POST = withHandler(async (req: NextRequest) => {
  // ── Per-IP rate limit ──────────────────────────────────────────────────
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    "unknown";
  const rl = await checkRateLimit(`register:${ip}`, REGISTER_LIMIT, { failOpen: false });
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: "Too many registration attempts. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  // ── Platform gate ────────────────────────────────────────────────────
  const [maintenance, registrationsOpen] = await Promise.all([
    getAppSetting("platform.maintenanceMode", false),
    getAppSetting("platform.newRegistrations", true),
  ]);
  if (maintenance) throw new UnprocessableError("Platform is under maintenance. Please try again later.");
  if (!registrationsOpen) throw new UnprocessableError("New registrations are currently disabled.");

  const body = await req.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { user, accessToken, refreshToken } = await authService.register(parsed.data);

  // Fire referral notification email (non-blocking)
  if (parsed.data.referralCode) {
    void (async () => {
      try {
        const referrerAcct = await loyaltyRepository.findByReferralCode(parsed.data.referralCode!);
        if (referrerAcct) {
          const referrer = await User.findById(referrerAcct.userId).select("name email").lean();
          if (referrer && referrer.email) {
            await sendReferralRegistrationEmail(
              referrer.email,
              referrer.name ?? "there",
              user.name ?? "A friend"
            );
          }
        }
      } catch (err) {
        console.error("[REGISTER] Referral email error:", err);
      }
    })();
  }

  const response = NextResponse.json({ user }, { status: 201 });
  setAuthCookies(response, accessToken, refreshToken);
  return response;
});
