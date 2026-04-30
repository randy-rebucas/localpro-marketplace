import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signAccessToken, signRefreshToken, setAuthCookies } from "@/lib/auth";
import { randomBytes } from "crypto";

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CALLBACK      = `${APP_URL}/api/auth/google/callback`;

interface GoogleProfile {
  sub:            string;
  name:           string;
  email?:         string;
  picture?:       string;
  email_verified: boolean;
}

export const GET = withHandler(async (req: NextRequest) => {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";
  const rl = await checkRateLimit(`google-callback:${ip}`, { windowMs: 15 * 60_000, max: 10 }, { failOpen: false });
  if (!rl.ok) {
    return NextResponse.redirect(`${APP_URL}/login?error=too_many_attempts`);
  }

  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieState = req.cookies.get("google_oauth_state")?.value;

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_denied`);
  }

  if (!state || state !== cookieState) {
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_state_mismatch`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  CALLBACK,
      grant_type:    "authorization_code",
    }).toString(),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_token_exchange`);
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string };

  // Fetch the user profile
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: "no-store",
  });

  if (!profileRes.ok) {
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_profile_fetch`);
  }

  const profile = (await profileRes.json()) as GoogleProfile;

  if (!profile.email || !profile.email_verified) {
    return NextResponse.redirect(`${APP_URL}/register?error=oauth_no_email`);
  }

  await connectDB();

  // Find by googleId, then fall back to email (link accounts)
  let userDoc = await User.findOne({ googleId: profile.sub });

  if (!userDoc) {
    userDoc = await User.findOne({ email: profile.email.toLowerCase() });
    if (userDoc) {
      userDoc.googleId      = profile.sub;
      userDoc.oauthProvider = "google";
      if (!userDoc.avatar && profile.picture) {
        userDoc.avatar = profile.picture;
      }
      await userDoc.save();
    }
  }

  if (!userDoc) {
    userDoc = await User.create({
      name:          profile.name,
      email:         profile.email.toLowerCase(),
      role:          "client",
      isVerified:    true,
      googleId:      profile.sub,
      oauthProvider: "google",
      avatar:        profile.picture ?? null,
      password:      randomBytes(32).toString("hex"),
    });
  }

  if (userDoc.isSuspended) {
    return NextResponse.redirect(`${APP_URL}/login?error=suspended`);
  }

  const accessToken  = signAccessToken(String(userDoc._id), userDoc.role);
  const refreshToken = signRefreshToken(String(userDoc._id));

  const dashboardRoutes: Record<string, string> = {
    client:   "/client/dashboard",
    provider: "/provider/dashboard",
    admin:    "/admin/dashboard",
    staff:    "/admin/dashboard",
    peso:     "/peso/dashboard",
  };
  const destination = dashboardRoutes[userDoc.role] ?? "/";

  const response = NextResponse.redirect(`${APP_URL}${destination}`, { status: 302 });
  setAuthCookies(response, accessToken, refreshToken);

  response.cookies.set("google_oauth_state", "", { maxAge: 0, path: "/" });

  return response;
});
