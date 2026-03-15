import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/services";
import { setAuthCookies } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, UnprocessableError } from "@/lib/errors";
import { getAppSetting } from "@/lib/appSettings";
import { checkRateLimit } from "@/lib/rateLimit";

const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
  role: z.enum(["client", "provider"]),
  referralCode: z.string().max(12).optional(),
});

// 5 registrations per 15 minutes per IP
const REGISTER_LIMIT = { windowMs: 15 * 60_000, max: 5 };

export const POST = withHandler(async (req: NextRequest) => {
  // ── Per-IP rate limit ──────────────────────────────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const rl = await checkRateLimit(`register:${ip}`, REGISTER_LIMIT);
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

  const response = NextResponse.json({ user }, { status: 201 });
  setAuthCookies(response, accessToken, refreshToken);
  return response;
});
