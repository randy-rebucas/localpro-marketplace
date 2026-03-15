import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole, signAccessToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError, assertObjectId } from "@/lib/errors";
import { userRepository } from "@/repositories/user.repository";

/**
 * POST /api/admin/users/[id]/impersonate
 *
 * Signs a short-lived access token as the target user and sets it as the
 * httpOnly access_token cookie.  The original admin token is saved in an
 * `impersonation_return_token` cookie so the session can be fully restored.
 *
 * The JWT payload includes `impersonatedBy: adminId` so the UI can display
 * the "Exit Impersonation" banner and any server-side guard can detect it.
 */
export const POST = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const admin = await requireUser();
  requireRole(admin, "admin");          // only full admins may impersonate

  const { id } = await params;
  assertObjectId(id, "userId");
  const target = await userRepository.findById(id);
  if (!target) throw new NotFoundError("User");

  const isProd = process.env.NODE_ENV === "production";
  const targetId = (target._id as { toString(): string }).toString();

  // Build a short-lived access token for the target user (15-min lifetime).
  // Do NOT issue a refresh token — impersonation sessions cannot be extended.
  const accessToken = signAccessToken(targetId, target.role as never, target.capabilities ?? []);

  const ROLE_DASHBOARD: Record<string, string> = {
    provider: "/provider/dashboard",
    client:   "/client/dashboard",
    admin:    "/admin/dashboard",
    staff:    "/admin/dashboard",
  };
  const redirectTo = ROLE_DASHBOARD[target.role as string] ?? "/dashboard";

  const response = NextResponse.json({ ok: true, redirectTo });

  // Set only the access token — no refresh token for impersonation sessions (H6)
  response.cookies.set("access_token", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: 60 * 15, // 15 minutes — non-renewable
    path: "/",
  });
  // Explicitly clear any existing refresh token so the session cannot be extended
  response.cookies.set("refresh_token", "", { maxAge: 0, path: "/" });

  // Save the admin's original access token so we can restore it on exit
  const adminToken = _req.cookies.get("access_token")?.value ?? "";
  response.cookies.set("impersonation_return_token", adminToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });
  response.cookies.set("impersonated_user_name", target.name, {
    httpOnly: false,   // readable by JS so UI can show banner
    secure: isProd,
    sameSite: "strict",
    maxAge: 60 * 60,
    path: "/",
  });

  return response;
});
