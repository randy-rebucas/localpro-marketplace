import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/services";
import { setAuthCookies } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
  role: z.enum(["client", "provider"]),
});

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { user, accessToken, refreshToken } = await authService.register(parsed.data);

  const response = NextResponse.json({ user }, { status: 201 });
  setAuthCookies(response, accessToken, refreshToken);
  return response;
});
