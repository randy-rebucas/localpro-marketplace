import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CALLBACK  = `${APP_URL}/api/auth/google/callback`;

export const GET = withHandler(async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit(`auth:google:${ip}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (!CLIENT_ID) {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 });
  }

  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  CALLBACK,
    response_type: "code",
    scope:         "openid email profile",
    state,
    access_type:   "online",
    prompt:        "select_account",
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );

  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
});
