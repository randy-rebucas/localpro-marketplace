import { NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { jobRepository, userRepository } from "@/repositories";

import { checkRateLimit } from "@/lib/rateLimit";
/**
 * GET /api/admin/fraud
 * Returns:
 *   - jobs: high-risk or fraud-flagged jobs (riskScore ≥ 50 or fraudFlags present)
 *   - users: clients/providers with non-empty fraudFlags or flaggedJobCount ≥ 2
 */
export const GET = withHandler(async () => {
  const admin = await requireUser();
  requireCapability(admin, "manage_jobs");
  const rl = await checkRateLimit(`admin:${admin.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const [flaggedJobs, suspiciousUsers] = await Promise.all([
    jobRepository.findFlaggedJobs({ riskThreshold: 50, limit: 100 }),
    userRepository.findSuspiciousUsers(100),
  ]);

  return NextResponse.json({ jobs: flaggedJobs, users: suspiciousUsers });
});
