import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET environment variable is not set");
const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

interface TokenPayload {
  userId: string;
  role: "client" | "provider" | "admin" | "staff";
  capabilities?: string[];
}

const ROLE_PREFIXES: Record<string, string> = {
  "/client": "client",
  "/provider": "provider",
  "/admin": "admin",
};

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/verify-email", "/reset-password"];

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  // ── Auth pages: redirect authenticated users to their dashboard ──
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
  if (isAuthPage) {
    if (accessToken) {
      const payload = await verifyToken(accessToken);
      if (payload) {
        // Staff share the admin dashboard
        const dashboardRole = payload.role === "staff" ? "admin" : payload.role;
        const dashboard = `/${dashboardRole}/dashboard`;
        return NextResponse.redirect(new URL(dashboard, req.url));
      }
    }
    return NextResponse.next();
  }

  // ── Protected dashboard routes ──
  const matchedPrefix = Object.keys(ROLE_PREFIXES).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!matchedPrefix) {
    return NextResponse.next();
  }

  const requiredRole = ROLE_PREFIXES[matchedPrefix];

  // Try access token first
  if (accessToken) {
    const payload = await verifyToken(accessToken);
    if (payload) {
      // Staff are allowed to access /admin/* routes
      const effectiveRole = payload.role === "staff" ? "admin" : payload.role;
      if (effectiveRole !== requiredRole) {
        // Redirect to the user's own dashboard
        const dashboardRole = payload.role === "staff" ? "admin" : payload.role;
        return NextResponse.redirect(
          new URL(`/${dashboardRole}/dashboard`, req.url)
        );
      }
      return NextResponse.next();
    }
  }

  // Try silent refresh if refresh token exists
  if (refreshToken) {
    // Resolve the internal base URL for token refresh.
    // Priority: explicit NEXT_INTERNAL_URL → Vercel deployment URL → localhost (dev only).
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
    const internalBase = process.env.NEXT_INTERNAL_URL ?? vercelUrl ?? "http://localhost:3000";
    const refreshUrl = new URL("/api/auth/refresh", internalBase);
    const refreshRes = await fetch(refreshUrl.toString(), {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });

    if (refreshRes.ok) {
      const response = NextResponse.redirect(req.url);
      // Forward Set-Cookie from refresh response
      const setCookie = refreshRes.headers.get("set-cookie");
      if (setCookie) {
        response.headers.set("set-cookie", setCookie);
      }
      return response;
    }
  }

  // Not authenticated — redirect to login
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/client/:path*",
    "/provider/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
