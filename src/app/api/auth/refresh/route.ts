import { NextResponse } from "next/server";
import { authService } from "@/services";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { UnauthorizedError } from "@/lib/errors";
import { cookies } from "next/headers";

export const POST = withHandler(async () => {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (!refreshToken) throw new UnauthorizedError("No refresh token");

  const tokens = await authService.refresh(refreshToken);

  const response = NextResponse.json({ success: true });
  setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
  return response;
});
