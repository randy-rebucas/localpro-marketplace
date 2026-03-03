import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminService } from "@/services";
import { requireUser, requireCapability, requireRole, STAFF_CAPABILITIES } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { userRepository } from "@/repositories";

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

  // Apply standard status updates through the service
  let result = await adminService.updateUser(user.userId, id, standardUpdates);

  // Apply role / capability updates directly
  if (role !== undefined || capabilities !== undefined) {
    const roleUpdate: { role?: string; capabilities?: string[] } = {};
    if (role !== undefined)         roleUpdate.role = role;
    if (capabilities !== undefined) roleUpdate.capabilities = capabilities;

    const updated = await userRepository.updateRoleAndCapabilities(id, roleUpdate);
    if (!updated) throw new NotFoundError("User");
    result = updated as never;
  }

  return NextResponse.json(result);
});

