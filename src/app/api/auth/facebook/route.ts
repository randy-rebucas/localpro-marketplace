import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

const APP_ID     = process.env.FACEBOOK_APP_ID!;
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CALLBACK   = `${APP_URL}/api/auth/facebook/callback`;

export const GET = withHandler(async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit(`auth:fb:${ip}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (!APP_ID) {
    return NextResponse.json({ error: "Facebook OAuth is not configured" }, { status: 503 });
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id:     APP_ID,
    redirect_uri:  CALLBACK,
    state,
    scope:         "email,public_profile",
    response_type: "code",
  });

  const response = NextResponse.redirect(
    `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`
  );

  response.cookies.set("fb_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
});
