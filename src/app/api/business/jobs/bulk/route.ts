import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError } from "@/lib/errors";
import { jobService } from "@/services";
import { businessMemberRepository } from "@/repositories";

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
  if (user.role !== "client") throw new ForbiddenError();

  const body = await req.json();
  const { orgId, jobs } = BulkUploadSchema.parse(body);

  // Verify caller is a member of the org
  const membership = await businessMemberRepository.findMembership(orgId, user.userId);
  if (!membership?.isActive) throw new ForbiddenError("Not a member of this org.");

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
