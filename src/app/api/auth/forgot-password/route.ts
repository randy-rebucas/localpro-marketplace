import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/services";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

const ForgotSchema = z.object({ email: z.string().email() });

// 3 requests per 15 minutes per email address
const FORGOT_EMAIL_LIMIT = { windowMs: 15 * 60_000, max: 3 };
// 3 requests per 15 minutes per IP
const FORGOT_IP_LIMIT = { windowMs: 15 * 60_000, max: 3 };

export const POST = withHandler(async (req: NextRequest) => {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";

  // Per-IP gate (cheapest check first, before parsing body)
  const ipRl = await checkRateLimit(`fp-ip:${ip}`, FORGOT_IP_LIMIT, { failOpen: false });
  if (!ipRl.ok) {
    return new Response(
      JSON.stringify({ error: "Too many password reset requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((ipRl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const body = await req.json();
  const parsed = ForgotSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("A valid email address is required");

  const email = parsed.data.email.toLowerCase();
  const rl = await checkRateLimit(`fp:${email}`, FORGOT_EMAIL_LIMIT, { failOpen: false });
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: "Too many password reset requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  // Always returns 200 — never reveals whether the email exists
  await authService.forgotPassword(parsed.data.email);
  return NextResponse.json({
    message: "If an account with that email exists, a reset link has been sent.",
  });
});
