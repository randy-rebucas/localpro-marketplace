import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signAccessToken, signRefreshToken, setAuthCookies } from "@/lib/auth";
import { randomBytes } from "crypto";

const APP_ID     = process.env.FACEBOOK_APP_ID!;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CALLBACK   = `${APP_URL}/api/auth/facebook/callback`;

interface FBProfile {
  id: string;
  name: string;
  email?: string;
  picture?: { data: { url: string } };
}

export const GET = withHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieState = req.cookies.get("fb_oauth_state")?.value;

  // User denied the permission dialog
  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_denied`);
  }

  // CSRF check
  if (!state || state !== cookieState) {
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_state_mismatch`);
  }

  // Exchange code for access token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?` +
      new URLSearchParams({
        client_id:     APP_ID,
        client_secret: APP_SECRET,
        redirect_uri:  CALLBACK,
        code,
      }).toString(),
    { cache: "no-store" }
  );
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_token_exchange`);
  }
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  // Fetch the user profile from Graph API
  const profileRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture.type(normal)&access_token=${access_token}`,
    { cache: "no-store" }
  );
  if (!profileRes.ok) {
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_profile_fetch`);
  }
  const profile = (await profileRes.json()) as FBProfile;

  await connectDB();

  // Find existing user by facebookId, or by email, or create new
  let userDoc = await User.findOne({ facebookId: profile.id });

  if (!userDoc && profile.email) {
    userDoc = await User.findOne({ email: profile.email.toLowerCase() });
    if (userDoc) {
      // Link FB account to existing email-based account
      userDoc.facebookId    = profile.id;
      userDoc.oauthProvider = "facebook";
      if (!userDoc.avatar && profile.picture?.data?.url) {
        userDoc.avatar = profile.picture.data.url;
      }
      await userDoc.save();
    }
  }

  if (!userDoc) {
    if (!profile.email) {
      // Can't create account without email
      return NextResponse.redirect(`${APP_URL}/register?error=oauth_no_email`);
    }
    // Create a new client account
    userDoc = await User.create({
      name:          profile.name,
      email:         profile.email.toLowerCase(),
      role:          "client",
      isVerified:    true, // email already verified by Facebook
      facebookId:    profile.id,
      oauthProvider: "facebook",
      avatar:        profile.picture?.data?.url ?? null,
      password:      randomBytes(32).toString("hex"), // irreversible placeholder
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
  };
  const destination = dashboardRoutes[userDoc.role] ?? "/";

  const response = NextResponse.redirect(`${APP_URL}${destination}`, { status: 302 });
  setAuthCookies(response, accessToken, refreshToken);

  // Clear the CSRF state cookie
  response.cookies.set("fb_oauth_state", "", { maxAge: 0, path: "/" });

  return response;
});
