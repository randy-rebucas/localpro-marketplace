import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";

/**
 * POST /api/admin/impersonate/exit
 *
 * Restores the admin's original session by swapping back the saved
 * `impersonation_return_token` cookie into `access_token`.
 */
export const POST = withHandler(async (req: NextRequest) => {
  const returnToken = req.cookies.get("impersonation_return_token")?.value ?? "";
  const isProd = process.env.NODE_ENV === "production";

  const response = NextResponse.json({ ok: true, redirectTo: "/admin/users" });

  if (returnToken) {
    response.cookies.set("access_token", returnToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 60 * 15,
      path: "/",
    });
  }
  // Clear impersonation cookies
  response.cookies.set("impersonation_return_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("impersonated_user_name", "", { maxAge: 0, path: "/" });

  return response;
});
