import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser, verifyAccessToken } from "@/lib/auth";
import { ForbiddenError } from "@/lib/errors";

/**
 * POST /api/admin/impersonate/exit
 *
 * Restores the admin's original session by swapping back the saved
 * `impersonation_return_token` cookie into `access_token`.
 *
 * H-6: Requires an active impersonation session — the current access_token
 * must have been issued for an impersonated user (impersonation_return_token
 * cookie must be present). This prevents any caller from swapping an arbitrary
 * saved token into the active session.
 */
export const POST = withHandler(async (req: NextRequest) => {
  // Must be authenticated
  await requireUser();

  // Must actually be in an impersonation session
  const returnToken = req.cookies.get("impersonation_return_token")?.value ?? "";
  if (!returnToken) {
    throw new ForbiddenError("Not in an impersonation session");
  }

  // Validate the return token before restoring it (reject forged/expired cookies)
  try {
    verifyAccessToken(returnToken);
  } catch {
    throw new ForbiddenError("Invalid impersonation return token");
  }

  const isProd = process.env.NODE_ENV === "production";

  const response = NextResponse.json({ ok: true, redirectTo: "/admin/users" });

  response.cookies.set("access_token", returnToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 60 * 15,
    path: "/",
  });
  // Clear impersonation cookies
  response.cookies.set("impersonation_return_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("impersonated_user_name", "", { maxAge: 0, path: "/" });

  return response;
});
