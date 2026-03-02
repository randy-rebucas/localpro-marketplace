import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, ForbiddenError } from "@/lib/errors";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

const BulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["verify", "suspend", "delete"]),
});

export const POST = withHandler(async (req: NextRequest) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_users");

  const body = await req.json();
  const parsed = BulkSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { ids, action } = parsed.data;

  // Safety: admins cannot bulk-delete other admins (only non-admin accounts)
  await connectDB();

  let update: Record<string, unknown>;
  let additionalFilter: Record<string, unknown> = {};

  switch (action) {
    case "verify":
      update = { isVerified: true };
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
      update = { isDeleted: true, deletedAt: new Date(), isSuspended: true };
      break;
  }

  const result = await User.updateMany(
    { _id: { $in: ids }, ...additionalFilter },
    { $set: update }
  );

  return NextResponse.json({ ok: true, affected: result.modifiedCount });
});
