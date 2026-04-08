import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";

  // Only apply special CORS handling for Chrome extension origins
  if (!origin.startsWith("chrome-extension://")) {
    return NextResponse.next();
  }

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        ...CORS_HEADERS,
      },
    });
  }

  // Attach CORS headers to actual response
  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", origin);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
