/**
 * GET  /api/apply/[jobId]            — PESO officer fetches all applicants for a job
 * PATCH /api/apply/[jobId]?id=appId  — PESO officer updates an application status
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { jobApplicationRepository } from "@/repositories/jobApplication.repository";
import { jobRepository } from "@/repositories";

const StatusSchema = z.object({
  id:     z.string().min(1),
  status: z.enum(["pending", "shortlisted", "rejected", "hired"]),
});

export const GET = withHandler(async (req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`apply-job-get:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { jobId } = await params;
  assertObjectId(jobId, "jobId");

  const job = await jobRepository.findById(jobId);
  if (!job) throw new NotFoundError("Job");

  const applicants = await jobApplicationRepository.findByJob(jobId);
  return NextResponse.json({ applicants, count: applicants.length });
});

export const PATCH = withHandler(async (req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) => {
  const user = await requireUser();
  requireCsrfToken(req, user);
  requireRole(user, "peso");

  const rl = await checkRateLimit(`apply-job-patch:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { jobId } = await params;
  assertObjectId(jobId, "jobId");

  const body = await req.json();
  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  assertObjectId(parsed.data.id, "applicationId");

  const updated = await jobApplicationRepository.updateStatus(parsed.data.id, parsed.data.status);
  if (!updated) throw new NotFoundError("Application");

  return NextResponse.json(updated);
});
