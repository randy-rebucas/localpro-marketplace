/**
 * GET  /api/apply/[jobId]            — PESO officer fetches all applicants for a job
 * PATCH /api/apply/[jobId]?id=appId  — PESO officer updates an application status
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { jobApplicationRepository } from "@/repositories/jobApplication.repository";
import { jobRepository } from "@/repositories";

const StatusSchema = z.object({
  id:     z.string().min(1),
  status: z.enum(["pending", "shortlisted", "rejected", "hired"]),
});

export const GET = withHandler(async (_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const { jobId } = await params;
  const job = await jobRepository.findById(jobId);
  if (!job) throw new NotFoundError("Job");

  const applicants = await jobApplicationRepository.findByJob(jobId);
  const count      = applicants.length;

  return NextResponse.json({ applicants, count });
});

export const PATCH = withHandler(async (req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) => {
  const user = await requireUser();
  requireRole(user, "peso");

  await params; // validate route param is present

  const body = await req.json();
  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const updated = await jobApplicationRepository.updateStatus(parsed.data.id, parsed.data.status);
  if (!updated) throw new NotFoundError("Application");

  return NextResponse.json(updated);
});
