import { NextResponse } from "next/server";
import { clearAuthCookies, getCurrentUser, revokeToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const POST = withHandler(async () => {
  // Revoke the current access token so it cannot be replayed after logout
  const user = await getCurrentUser();
  if (user?.jti) {
    await revokeToken(user.jti);
  }

  const response = NextResponse.json({ message: "Logged out successfully" });
  clearAuthCookies(response);
  return response;
});
