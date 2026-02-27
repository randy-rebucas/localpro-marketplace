import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/services";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const ForgotSchema = z.object({ email: z.string().email() });

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = ForgotSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("A valid email address is required");

  // Always returns 200 — never reveals whether the email exists
  await authService.forgotPassword(parsed.data.email);
  return NextResponse.json({
    message: "If an account with that email exists, a reset link has been sent.",
  });
});
