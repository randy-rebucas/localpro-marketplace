import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getCurrentUser, revokeToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

export const POST = withHandler(async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit(`auth:logout:${ip}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const user = await getCurrentUser();
  if (user?.jti) {
    await revokeToken(user.jti);
  }

  const response = NextResponse.json({ message: "Logged out successfully" });
  clearAuthCookies(response);
  return response;
});
