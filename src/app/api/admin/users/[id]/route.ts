import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminService } from "@/services";
import { requireUser, requireCapability, requireRole, STAFF_CAPABILITIES, revokeAllUserTokens } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { userRepository, activityRepository } from "@/repositories";

import { checkRateLimit } from "@/lib/rateLimit";
const UpdateUserSchema = z.object({
  isVerified:     z.boolean().optional(),
  isSuspended:    z.boolean().optional(),
  approvalStatus: z.enum(["pending_approval", "approved", "rejected"]).optional(),
  // Role / capability editor
  role:           z.enum(["client", "provider", "admin", "staff"]).optional(),
  capabilities:   z.array(z.string()).optional(),
});

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCapability(user, "manage_users");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  const target = await adminService.getUser(id);
  return NextResponse.json(target);
});

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCapability(user, "manage_users");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { role, capabilities, ...standardUpdates } = parsed.data;

  // Role changes: only full admins may change a user's role
  if (role !== undefined || capabilities !== undefined) {
    requireRole(user, "admin");
  }

  // Validate capabilities are known
  if (capabilities) {
    const invalid = capabilities.filter((c) => !(STAFF_CAPABILITIES as readonly string[]).includes(c));
    if (invalid.length) throw new ValidationError(`Unknown capabilities: ${invalid.join(", ")}`);
  }

  // Fetch target user before update (for audit metadata)
  const targetBefore = await userRepository.findById(id);
  if (!targetBefore) throw new NotFoundError("User");

  // Apply standard status updates through the service
  let result = await adminService.updateUser(user.userId, id, standardUpdates);

  // Immediately revoke all active tokens when suspending a user
  if (standardUpdates.isSuspended === true) {
    await revokeAllUserTokens(id);
  }

  // ── Audit log for status changes ────────────────────────────────────────
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? undefined;

  if (standardUpdates.isSuspended === true) {
    activityRepository.log({
      userId: user.userId,
      eventType: "account_suspended",
      ipAddress: ip,
      metadata: { targetUserId: id, targetEmail: targetBefore.email, targetRole: targetBefore.role },
    }).catch(() => {});
  } else if (standardUpdates.isSuspended === false) {
    activityRepository.log({
      userId: user.userId,
      eventType: "account_unsuspended",
      ipAddress: ip,
      metadata: { targetUserId: id, targetEmail: targetBefore.email, targetRole: targetBefore.role },
    }).catch(() => {});
  }

  if (standardUpdates.approvalStatus === "approved") {
    activityRepository.log({
      userId: user.userId,
      eventType: "provider_approved",
      ipAddress: ip,
      metadata: { targetUserId: id, targetEmail: targetBefore.email },
    }).catch(() => {});
  } else if (standardUpdates.approvalStatus === "rejected") {
    activityRepository.log({
      userId: user.userId,
      eventType: "provider_rejected",
      ipAddress: ip,
      metadata: { targetUserId: id, targetEmail: targetBefore.email },
    }).catch(() => {});
  }

  // Apply role / capability updates directly
  if (role !== undefined || capabilities !== undefined) {
    const roleUpdate: { role?: string; capabilities?: string[] } = {};
    if (role !== undefined)         roleUpdate.role = role;
    if (capabilities !== undefined) roleUpdate.capabilities = capabilities;

    const updated = await userRepository.updateRoleAndCapabilities(id, roleUpdate);
    if (!updated) throw new NotFoundError("User");
    result = updated as never;

    if (role !== undefined) {
      activityRepository.log({
        userId: user.userId,
        eventType: "role_changed",
        ipAddress: ip,
        metadata: { targetUserId: id, targetEmail: targetBefore.email, fromRole: targetBefore.role, toRole: role },
      }).catch(() => {});
    }
  }

  return NextResponse.json(result);
});

