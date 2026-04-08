import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services";
import { signExtensionToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { LoginSchema } from "@/lib/validation";

// 5 attempts per minute per IP
const EXT_TOKEN_LIMIT = { windowMs: 60_000, max: 5 };

export const POST = withHandler(async (req: NextRequest) => {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    "unknown";

  const rl = await checkRateLimit(`ext-token:${ip}`, EXT_TOKEN_LIMIT, { failOpen: false });
  if (!rl.ok) {
    return new NextResponse(
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

  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  // Reuse the same login logic (lockout, password check, etc.)
  const { user } = await authService.login(parsed.data);

  const token = signExtensionToken(user._id, user.role);

  return NextResponse.json({
    token,
    role: user.role,
    name: user.name,
    userId: user._id,
  });
});
