import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services";
import { setAuthCookies } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { LoginSchema } from "@/lib/validation";

// 10 attempts per 15 minutes per email address
const LOGIN_LIMIT = { windowMs: 15 * 60_000, max: 10 };
// 5 attempts per minute per IP (separate from account-level lockout)
const LOGIN_IP_LIMIT = { windowMs: 60_000, max: 5 };

export const POST = withHandler(async (req: NextRequest) => {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";

  // Per-IP gate (first — cheapest check before DB)
  const ipRl = await checkRateLimit(`login-ip:${ip}`, LOGIN_IP_LIMIT, { failOpen: false });
  if (!ipRl.ok) {
    return new Response(
      JSON.stringify({ error: "Too many login attempts from this IP. Please try again later." }),
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
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const email = parsed.data.email.toLowerCase();
  const rl = await checkRateLimit(`login:${email}`, LOGIN_LIMIT, { failOpen: false });
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: "Too many login attempts. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const { user, accessToken, refreshToken } = await authService.login(parsed.data);

  const response = NextResponse.json({ user });
  setAuthCookies(response, accessToken, refreshToken);
  return response;
});
