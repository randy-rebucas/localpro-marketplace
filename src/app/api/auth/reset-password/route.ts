import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/services";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const ResetSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
});

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = ResetSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await authService.resetPassword(parsed.data.token, parsed.data.password);
  return NextResponse.json({ message: "Password reset successfully. You can now log in." });
});
