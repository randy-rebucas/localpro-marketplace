import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/services";
import { setAuthCookies } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// 10 attempts per 15 minutes per email address
const LOGIN_LIMIT = { windowMs: 15 * 60_000, max: 10 };

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const email = parsed.data.email.toLowerCase();
  const rl = checkRateLimit(`login:${email}`, LOGIN_LIMIT);
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
