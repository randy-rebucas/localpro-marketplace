import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/services";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

const ForgotSchema = z.object({ email: z.string().email() });

// 5 attempts per 15 minutes per email address
const FORGOT_LIMIT = { windowMs: 15 * 60_000, max: 5 };

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = ForgotSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("A valid email address is required");

  const email = parsed.data.email.toLowerCase();
  const rl = checkRateLimit(`fp:${email}`, FORGOT_LIMIT);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
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
