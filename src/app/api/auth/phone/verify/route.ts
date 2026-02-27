import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signAccessToken, signRefreshToken, setAuthCookies } from "@/lib/auth";
import { checkOtp } from "@/lib/twilio";
import { ValidationError, UnauthorizedError, NotFoundError } from "@/lib/errors";

/**
 * POST /api/auth/phone/verify
 * Body: { phone: string; code: string }
 *
 * Validates the OTP via Twilio Verify and issues JWT cookies on success.
 */
export const POST = withHandler(async (req: NextRequest) => {
  const { phone, code } = await req.json();

  if (!phone) throw new ValidationError("Phone number is required");
  if (!code || !/^\d{6}$/.test(String(code))) throw new ValidationError("Enter the 6-digit code");

  const normalizedPhone = String(phone).replace(/\s/g, "");

  // Verify the code with Twilio — throws on service error, returns false on wrong code
  const approved = await checkOtp(normalizedPhone, String(code));
  if (!approved) throw new UnauthorizedError("Invalid or expired OTP code.");

  await connectDB();

  const userDoc = await User.findOne({ phone: normalizedPhone });
  if (!userDoc) throw new NotFoundError("User");

  if (userDoc.isSuspended) throw new UnauthorizedError("Your account has been suspended.");

  // Mark phone as verified
  userDoc.isVerified = true;
  await userDoc.save();

  const accessToken  = signAccessToken(String(userDoc._id), userDoc.role);
  const refreshToken = signRefreshToken(String(userDoc._id));

  const response = NextResponse.json({
    message: "Phone verified successfully.",
    user: {
      id:   String(userDoc._id),
      name: userDoc.name,
      role: userDoc.role,
    },
  });

  setAuthCookies(response, accessToken, refreshToken);

  return response;
});
