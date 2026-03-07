import { NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { jobRepository, userRepository } from "@/repositories";

/**
 * GET /api/admin/fraud
 * Returns:
 *   - jobs: high-risk or fraud-flagged jobs (riskScore ≥ 50 or fraudFlags present)
 *   - users: clients/providers with non-empty fraudFlags or flaggedJobCount ≥ 2
 */
export const GET = withHandler(async () => {
  const admin = await requireUser();
  requireCapability(admin, "manage_jobs");

  const [flaggedJobs, suspiciousUsers] = await Promise.all([
    jobRepository.findFlaggedJobs({ riskThreshold: 50, limit: 100 }),
    userRepository.findSuspiciousUsers(100),
  ]);

  return NextResponse.json({ jobs: flaggedJobs, users: suspiciousUsers });
});
