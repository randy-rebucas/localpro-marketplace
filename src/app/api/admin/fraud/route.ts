import { NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { jobRepository } from "@/repositories";
import User from "@/models/User";

/**
 * GET /api/admin/fraud
 * Returns:
 *   - jobs: high-risk or fraud-flagged jobs (riskScore ≥ 50 or fraudFlags present)
 *   - users: clients/providers with non-empty fraudFlags or flaggedJobCount ≥ 2
 */
export const GET = withHandler(async () => {
  const admin = await requireUser();
  requireCapability(admin, "manage_jobs");

  await connectDB();

  const [flaggedJobs, suspiciousUsers] = await Promise.all([
    jobRepository.findFlaggedJobs({ riskThreshold: 50, limit: 100 }),
    User.find({
      $or: [
        { fraudFlags: { $exists: true, $not: { $size: 0 } } },
        { flaggedJobCount: { $gte: 2 } },
      ],
      isDeleted: { $ne: true },
    })
      .select("name email role kycStatus isVerified isSuspended flaggedJobCount fraudFlags createdAt")
      .sort({ flaggedJobCount: -1, createdAt: -1 })
      .limit(100)
      .lean(),
  ]);

  return NextResponse.json({ jobs: flaggedJobs, users: suspiciousUsers });
});
