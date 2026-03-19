import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * GET /api/unsubscribe?token=...
 *
 * One-click unsubscribe handler. Verifies the HMAC token, disables marketing
 * emails for the user, and redirects to a confirmation page.
 *
 * No authentication required — must work directly from email links.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Missing unsubscribe token" },
      { status: 400 },
    );
  }

  const result = verifyUnsubscribeToken(token);
  if (!result) {
    return NextResponse.json(
      { error: "Invalid or malformed unsubscribe token" },
      { status: 400 },
    );
  }

  await connectDB();
  await User.updateOne(
    { _id: result.userId },
    { $set: { "preferences.marketingEmails": false } },
  );

  return NextResponse.redirect(`${APP_URL}/unsubscribe?success=true`);
}

/**
 * POST /api/unsubscribe?token=...
 *
 * RFC 8058 List-Unsubscribe-Post handler. Email clients (Gmail, Apple Mail)
 * may POST to the unsubscribe URL with `List-Unsubscribe=One-Click-Unsubscribe`.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Missing unsubscribe token" },
      { status: 400 },
    );
  }

  const result = verifyUnsubscribeToken(token);
  if (!result) {
    return NextResponse.json(
      { error: "Invalid or malformed unsubscribe token" },
      { status: 400 },
    );
  }

  await connectDB();
  await User.updateOne(
    { _id: result.userId },
    { $set: { "preferences.marketingEmails": false } },
  );

  return NextResponse.json({ success: true });
}
