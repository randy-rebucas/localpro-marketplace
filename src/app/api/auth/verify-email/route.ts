import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/services";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const VerifySchema = z.object({ token: z.string().min(1) });

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("Token is required");

  await authService.verifyEmail(parsed.data.token);
  return NextResponse.json({ message: "Email verified successfully" });
});
