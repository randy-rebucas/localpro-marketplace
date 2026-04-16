import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import z from "zod";

/**
 * Schema for registering an Expo push token
 * Token format: ExponentPushToken[...]
 */
const RegisterTokenSchema = z.object({
  token: z
    .string()
    .min(1, "Token is required")
    .refine(
      (token) => token.startsWith("ExponentPushToken[") || /^[a-zA-Z0-9_-]+$/.test(token),
      "Invalid token format. Must be ExponentPushToken[...] or alphanumeric."
    ),
  deviceId: z.string().optional(),
});

type RegisterTokenRequest = z.infer<typeof RegisterTokenSchema>;

/**
 * POST /api/notifications/register-token
 *
 * Register or update an Expo push token for the authenticated user.
 * Allows storing multiple tokens per user for different devices.
 *
 * Request body:
 * {
 *   "token": "ExponentPushToken[...string...]",
 *   "deviceId": "device-id-optional"  // Optional unique device identifier
 * }
 *
 * Response: { success: true, token: "...", isNew: boolean }
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  await connectDB();

  const body = await req.json();
  const { token, deviceId } = RegisterTokenSchema.parse(body);

  // Get the user document with expoPushTokens
  const userDoc = await User.findById(user.userId).select("+expoPushTokens");

  if (!userDoc) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  // Initialize expoPushTokens array if it doesn't exist
  if (!userDoc.expoPushTokens) {
    userDoc.expoPushTokens = [];
  }

  // Check if token already exists (case-sensitive)
  const existingIndex = userDoc.expoPushTokens.findIndex(
    (record) => record.token === token
  );

  const now = new Date();
  let isNew = false;

  if (existingIndex > -1) {
    // Update existing token's lastUsedAt
    userDoc.expoPushTokens[existingIndex].lastUsedAt = now;
    if (deviceId && !userDoc.expoPushTokens[existingIndex].deviceId) {
      userDoc.expoPushTokens[existingIndex].deviceId = deviceId;
    }
  } else {
    // Add new token
    userDoc.expoPushTokens.push({
      token,
      deviceId,
      createdAt: now,
      lastUsedAt: now,
    });
    isNew = true;

    // Optional: Limit tokens per user to 50 to prevent unbounded growth
    if (userDoc.expoPushTokens.length > 50) {
      // Remove oldest token by lastUsedAt
      userDoc.expoPushTokens.sort(
        (a, b) => a.lastUsedAt.getTime() - b.lastUsedAt.getTime()
      );
      userDoc.expoPushTokens = userDoc.expoPushTokens.slice(-50);
    }
  }

  await userDoc.save();

  return NextResponse.json(
    {
      success: true,
      token,
      isNew,
      message: isNew
        ? "Expo push token registered successfully"
        : "Expo push token updated successfully",
    },
    { status: isNew ? 201 : 200 }
  );
});

/**
 * GET /api/notifications/register-token
 *
 * Retrieve all registered Expo push tokens for the authenticated user.
 *
 * Response: { tokens: Array<{ token, deviceId, createdAt, lastUsedAt }> }
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  await connectDB();

  const userDoc = await User.findById(user.userId).select("+expoPushTokens");

  if (!userDoc) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  const tokens = (userDoc.expoPushTokens || []).map((record) => ({
    token: record.token,
    deviceId: record.deviceId,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
  }));

  return NextResponse.json({
    tokens,
    count: tokens.length,
  });
});

/**
 * DELETE /api/notifications/register-token
 *
 * Remove a specific Expo push token for the authenticated user.
 *
 * Query params:
 *   - token: The token to remove
 *
 * Response: { success: true, message: "Token removed" }
 */
export const DELETE = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  await connectDB();

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token query parameter is required" },
      { status: 400 }
    );
  }

  const userDoc = await User.findById(user.userId).select("+expoPushTokens");

  if (!userDoc) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  if (!userDoc.expoPushTokens) {
    userDoc.expoPushTokens = [];
  }

  const initialLength = userDoc.expoPushTokens.length;
  userDoc.expoPushTokens = userDoc.expoPushTokens.filter(
    (record) => record.token !== token
  );

  const wasRemoved = userDoc.expoPushTokens.length < initialLength;

  if (wasRemoved) {
    await userDoc.save();
    return NextResponse.json({
      success: true,
      message: "Expo push token removed successfully",
    });
  }

  return NextResponse.json(
    { error: "Token not found" },
    { status: 404 }
  );
});
