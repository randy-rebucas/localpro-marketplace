import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { userRepository } from "@/repositories";
import { checkRateLimit } from "@/lib/rateLimit";
import z from "zod";

const RegisterTokenSchema = z.object({
  token: z
    .string()
    .min(1, "Token is required")
    .refine(
      (t) => t.startsWith("ExponentPushToken[") || /^[a-zA-Z0-9_-]{20,}$/.test(t),
      "Invalid token format. Must be ExponentPushToken[...] or a valid device token."
    ),
  deviceId: z.string().optional(),
});

/**
 * POST /api/notifications/register-token
 * Register or update an Expo push token for the authenticated user.
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`push-token-register:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const { token, deviceId } = RegisterTokenSchema.parse(body);

  const userDoc = await userRepository.getDocByIdWithPushTokens(user.userId);
  if (!userDoc) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!userDoc.expoPushTokens) userDoc.expoPushTokens = [];

  const existingIndex = userDoc.expoPushTokens.findIndex((r) => r.token === token);
  const now = new Date();
  let isNew = false;

  if (existingIndex > -1) {
    userDoc.expoPushTokens[existingIndex].lastUsedAt = now;
    if (deviceId && !userDoc.expoPushTokens[existingIndex].deviceId) {
      userDoc.expoPushTokens[existingIndex].deviceId = deviceId;
    }
  } else {
    userDoc.expoPushTokens.push({ token, deviceId, createdAt: now, lastUsedAt: now });
    isNew = true;

    // Enforce 50-token cap — evict oldest by lastUsedAt
    if (userDoc.expoPushTokens.length > 50) {
      userDoc.expoPushTokens.sort((a, b) => a.lastUsedAt.getTime() - b.lastUsedAt.getTime());
      userDoc.expoPushTokens = userDoc.expoPushTokens.slice(-50);
    }
  }

  await userDoc.save();

  return NextResponse.json(
    {
      success: true,
      isNew,
      message: isNew ? "Push token registered" : "Push token updated",
    },
    { status: isNew ? 201 : 200 }
  );
});

/**
 * GET /api/notifications/register-token
 * Retrieve all registered push tokens for the authenticated user.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`push-token-list:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const userDoc = await userRepository.getDocByIdWithPushTokens(user.userId);
  if (!userDoc) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const tokens = (userDoc.expoPushTokens || []).map((r) => ({
    token: r.token,
    deviceId: r.deviceId,
    createdAt: r.createdAt,
    lastUsedAt: r.lastUsedAt,
  }));

  return NextResponse.json({ tokens, count: tokens.length });
});

/**
 * DELETE /api/notifications/register-token
 * Remove a specific push token. Token passed in the request body.
 */
export const DELETE = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`push-token-delete:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const token = body?.token;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token is required in the request body" }, { status: 400 });
  }

  const userDoc = await userRepository.getDocByIdWithPushTokens(user.userId);
  if (!userDoc) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!userDoc.expoPushTokens) userDoc.expoPushTokens = [];

  const before = userDoc.expoPushTokens.length;
  userDoc.expoPushTokens = userDoc.expoPushTokens.filter((r) => r.token !== token);

  if (userDoc.expoPushTokens.length < before) {
    await userDoc.save();
    return NextResponse.json({ success: true, message: "Push token removed" });
  }

  return NextResponse.json({ error: "Token not found" }, { status: 404 });
});
