import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { sendOtp } from "@/lib/twilio";
import { ValidationError } from "@/lib/errors";
import { randomBytes } from "crypto";

/**
 * POST /api/auth/phone/send
 * Body: { phone: string }
 *
 * Triggers a Twilio Verify SMS to the given number.
 * Twilio manages the code — nothing is stored in the DB.
 */
export const POST = withHandler(async (req: NextRequest) => {
  const { phone } = await req.json();

  if (!phone || !/^\+?[1-9]\d{6,14}$/.test(String(phone).replace(/\s/g, ""))) {
    throw new ValidationError("Please provide a valid phone number (e.g. +639XXXXXXXXX)");
  }

  const normalizedPhone = String(phone).replace(/\s/g, "");

  await connectDB();

  // Atomically ensure a user record exists for this phone number.
  // Using upsert avoids a race condition where two rapid requests both
  // see no existing user and both try to INSERT, causing a duplicate-key error.
  await User.findOneAndUpdate(
    { phone: normalizedPhone },
    {
      $setOnInsert: {
        name:       "Phone User",
        email:      `phone_${normalizedPhone.replace(/\+/g, "")}@localpro.ph`,
        phone:      normalizedPhone,
        role:       "client",
        isVerified: false,
        password:   randomBytes(32).toString("hex"),
      },
    },
    { upsert: true, new: false }
  );

  // Delegate OTP generation + delivery to Twilio Verify
  await sendOtp(normalizedPhone);

  return NextResponse.json({ message: "OTP sent to your phone number." });
});
