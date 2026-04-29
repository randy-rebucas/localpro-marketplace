/**
 * POST /api/apply          — Provider submits a job application (PESO / LGU jobs)
 * GET  /api/apply          — Provider fetches their own applied job IDs
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, ConflictError, NotFoundError, ForbiddenError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { jobApplicationRepository } from "@/repositories/jobApplication.repository";
import { jobRepository, userRepository } from "@/repositories";

const ApplySchema = z.object({
  jobId:        z.string().min(1),
  coverLetter:  z.string().min(20, "Cover letter must be at least 20 characters").max(2000),
  availability: z.string().min(1, "Availability is required").max(200),
  resumeUrl:    z.string().url().optional().or(z.literal("")),
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);
  requireRole(user, "provider");

  const rl = await checkRateLimit(`apply-post:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = ApplySchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { jobId, coverLetter, availability, resumeUrl } = parsed.data;
  assertObjectId(jobId, "jobId");

  // Agency staff cannot apply to jobs independently
  const providerUser = await userRepository.findById(user.userId);
  if ((providerUser as { agencyId?: unknown } | null)?.agencyId) {
    throw new ForbiddenError(
      "Agency staff members cannot apply to jobs independently. Your agency owner will dispatch assignments to you."
    );
  }

  const job = await jobRepository.findById(jobId);
  if (!job) throw new NotFoundError("Job");
  const j = job as unknown as { jobSource?: string; status: string };
  if (j.jobSource !== "peso" && j.jobSource !== "lgu") {
    throw new ValidationError("This job does not accept applications — use the quote system instead.");
  }
  if (j.status !== "open") {
    throw new ValidationError("This job is no longer accepting applications.");
  }

  const existing = await jobApplicationRepository.findByApplicantAndJob(user.userId, jobId);
  if (existing) throw new ConflictError("You have already applied to this job.");

  const application = await jobApplicationRepository.create({
    jobId:       jobId as never,
    applicantId: user.userId as never,
    coverLetter,
    availability,
    ...(resumeUrl ? { resumeUrl } : {}),
    status: "pending",
  });

  return NextResponse.json(application, { status: 201 });
});

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const rl = await checkRateLimit(`apply-get:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const applications = await jobApplicationRepository.findByApplicant(user.userId);
  const appliedJobIds = applications.map(
    (a) => (a as unknown as { jobId: { toString(): string } }).jobId.toString()
  );
  return NextResponse.json({ appliedJobIds });
});
