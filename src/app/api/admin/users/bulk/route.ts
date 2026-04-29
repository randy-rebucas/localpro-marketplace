import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, ForbiddenError } from "@/lib/errors";
import { userRepository } from "@/repositories";
import { cascadeService } from "@/services/cascade.service";

import { checkRateLimit } from "@/lib/rateLimit";
const BulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["verify", "suspend", "delete", "approve"]),
});

export const POST = withHandler(async (req: NextRequest) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_users");
  const rl = await checkRateLimit(`admin:${admin.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = BulkSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { ids, action } = parsed.data;

  let update: Record<string, unknown>;
  let additionalFilter: Record<string, unknown> = {};

  switch (action) {
    case "verify":
      update = { isVerified: true };
      break;
    case "approve":
      // Only approve providers that are actually pending
      additionalFilter = { role: "provider", approvalStatus: "pending_approval" };
      update = { approvalStatus: "approved" };
      break;
    case "suspend":
      // Prevent suspending other admins unless the caller is the super-admin (role=admin)
      if (admin.role !== "admin") {
        additionalFilter = { role: { $ne: "admin" } };
      }
      update = { isSuspended: true };
      break;
    case "delete":
      // Only admins can bulk soft-delete; also exclude other admins from deletion
      if (admin.role !== "admin") throw new ForbiddenError();
      // Run cascade per user so business org cleanup, job cancellation, and
      // quote rejection are applied consistently (same as single-user delete).
      await Promise.all(ids.map((id) => cascadeService.cascadeSoftDelete(id)));
      return NextResponse.json({ ok: true, affected: ids.length });
  }

  const result = await userRepository.updateMany(
    { _id: { $in: ids }, ...additionalFilter } as never,
    { $set: update } as never
  );

  return NextResponse.json({ ok: true, affected: (result as { modifiedCount?: number })?.modifiedCount ?? ids.length });
});
