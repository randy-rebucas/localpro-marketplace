import { NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";

const APP_ID     = process.env.FACEBOOK_APP_ID!;
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CALLBACK   = `${APP_URL}/api/auth/facebook/callback`;

export const GET = withHandler(async () => {
  if (!APP_ID) {
    return NextResponse.json({ error: "Facebook OAuth is not configured" }, { status: 503 });
  }

  const state = crypto.randomUUID(); // CSRF token — ideally stored in a short-lived cookie
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

  // Store state in a short-lived cookie for CSRF validation
  response.cookies.set("fb_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 min
    path: "/",
  });

  return response;
});
