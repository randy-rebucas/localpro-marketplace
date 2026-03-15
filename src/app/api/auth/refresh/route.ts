import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { UnauthorizedError } from "@/lib/errors";
import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/rateLimit";

// 20 token refreshes per 15 minutes per IP
const REFRESH_LIMIT = { windowMs: 15 * 60_000, max: 20 };

export const POST = withHandler(async (req: NextRequest) => {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";
  const rl = await checkRateLimit(`refresh:${ip}`, REFRESH_LIMIT, { failOpen: false });
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: "Too many token refresh requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (!refreshToken) throw new UnauthorizedError("No refresh token");

  const tokens = await authService.refresh(refreshToken);

  const response = NextResponse.json({ success: true });
  setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
  return response;
});
