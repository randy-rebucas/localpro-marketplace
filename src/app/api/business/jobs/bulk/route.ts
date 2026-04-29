import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { jobService } from "@/services";
import { businessMemberRepository } from "@/repositories";
import { businessOrganizationRepository } from "@/repositories/businessOrganization.repository";
import { businessService } from "@/services/business.service";
import { getJobLimit, PLAN_LABELS, hasBulkAndRecurringAccess } from "@/lib/businessPlan";

const BulkJobRowSchema = z.object({
  title:               z.string().min(5).max(200),
  category:            z.string().min(1),
  description:         z.string().min(10),
  budget:              z.number().positive(),
  location:            z.string().min(1),
  scheduleDate:        z.string(),
  specialInstructions: z.string().optional(),
});

const BulkUploadSchema = z.object({
  orgId: z.string(),
  jobs:  z.array(BulkJobRowSchema).min(1).max(50),
});

/**
 * POST /api/business/jobs/bulk
 * Creates multiple jobs in one request. Payload derived from client-side CSV parse.
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);
  if (user.role !== "client") throw new ForbiddenError();

  const rl = await checkRateLimit(`biz-jobs-bulk:${user.userId}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = BulkUploadSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { orgId, jobs } = parsed.data;
  assertObjectId(orgId, "orgId");

  // Verify caller is a member of the org
  const membership = await businessMemberRepository.findMembership(orgId, user.userId);
  if (!membership?.isActive) throw new ForbiddenError("Not a member of this org.");

  // ── Plan feature gate: Bulk upload requires Pro or Enterprise ──────────────
  const orgForGate = await businessOrganizationRepository.findOrgById(orgId);
  if (!orgForGate || !hasBulkAndRecurringAccess(orgForGate.plan)) {
    throw new ForbiddenError(
      "Bulk CSV upload is available on the Pro and Enterprise plans. Upgrade your plan to use this feature."
    );
  }

  // ── Plan monthly job limit check ─────────────────────────────────────────
  const monthlyCount = await businessService.countMonthlyJobsForOrg(orgId);
  const limit = getJobLimit(orgForGate.plan);
  if (limit !== Infinity) {
    const remaining = limit - monthlyCount;
    if (remaining <= 0) {
      throw new ForbiddenError(
        `Your ${PLAN_LABELS[orgForGate.plan]} plan allows up to ${limit} job${limit === 1 ? "" : "s"} per month and you have reached the limit. Upgrade your plan to post more jobs.`
      );
    }
    if (jobs.length > remaining) {
      throw new ForbiddenError(
        `You can only post ${remaining} more job${remaining === 1 ? "" : "s"} this month (${PLAN_LABELS[orgForGate.plan]} plan limit: ${limit}/month). Reduce the batch size or upgrade your plan.`
      );
    }
  }

  const results: { index: number; jobId?: string; error?: string }[] = [];

  for (let i = 0; i < jobs.length; i++) {
    const row = jobs[i];
    try {
      const schedDate = new Date(row.scheduleDate);
      if (isNaN(schedDate.getTime())) throw new Error("Invalid scheduleDate");

      const job = await jobService.createJob(user, {
        title:               row.title,
        category:            row.category,
        description:         row.description,
        budget:              row.budget,
        location:            row.location,
        scheduleDate:        schedDate.toISOString(),
        specialInstructions: row.specialInstructions,
      });
      results.push({ index: i, jobId: String((job as { _id: unknown })._id) });
    } catch (err) {
      results.push({ index: i, error: err instanceof Error ? err.message : "Failed" });
    }
  }

  const created = results.filter((r) => r.jobId).length;
  const failed  = results.filter((r) => r.error).length;

  return NextResponse.json({ created, failed, results });
});
