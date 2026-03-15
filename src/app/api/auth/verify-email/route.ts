import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/services";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

const VerifySchema = z.object({ token: z.string().min(1) });

// 10 attempts per 15 minutes per IP
const VERIFY_LIMIT = { windowMs: 15 * 60_000, max: 10 };

export const POST = withHandler(async (req: NextRequest) => {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";
  const rl = await checkRateLimit(`verify-email:${ip}`, VERIFY_LIMIT, { failOpen: false });
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: "Too many verification attempts. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const body = await req.json();
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("Token is required");

  await authService.verifyEmail(parsed.data.token);
  return NextResponse.json({ message: "Email verified successfully" });
});
