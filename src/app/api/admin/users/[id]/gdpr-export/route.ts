import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";
import { userRepository } from "@/repositories/user.repository";
import { activityRepository } from "@/repositories/activity.repository";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import Review from "@/models/Review";
import Message from "@/models/Message";

/**
 * GET /api/admin/users/[id]/gdpr-export
 *
 * Exports all personal data we hold for the user as a JSON file.
 * Covers: account info, addresses, activity log, jobs, reviews, messages.
 */
export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_users");

  const { id } = await params;
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError("User");

  await connectDB();

  const [activityResult, jobs, reviews, messages] = await Promise.all([
    activityRepository.findByUser(id, { page: 1, limit: 1000 }),
    Job.find({ $or: [{ clientId: id }, { providerId: id }] })
      .select("title status budget createdAt")
      .lean(),
    Review.find({ $or: [{ reviewerId: id }, { providerId: id }] })
      .select("rating comment createdAt")
      .lean(),
    Message.find({ senderId: id })
      .select("content createdAt")
      .lean(),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    account: {
      id:             (user._id as { toString(): string }).toString(),
      name:           (user as { name: string }).name,
      email:          (user as { email: string }).email,
      role:           (user as { role: string }).role,
      phone:          (user as { phone?: string }).phone ?? null,
      isVerified:     (user as { isVerified?: boolean }).isVerified ?? false,
      kycStatus:      (user as { kycStatus?: string }).kycStatus ?? "none",
      createdAt:      (user as { createdAt?: Date | string }).createdAt,
    },
    addresses:   (user as { addresses?: unknown[] }).addresses ?? [],
    activity:    activityResult.logs,
    jobs,
    reviews,
    messages,
  };

  const json = JSON.stringify(exportData, null, 2);
  const name  = ((user as { name: string }).name ?? "user").replace(/\s+/g, "_").toLowerCase();
  const filename = `gdpr_export_${name}_${new Date().toISOString().split("T")[0]}.json`;

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
