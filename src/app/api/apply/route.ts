/**
 * POST /api/apply          — Provider submits a job application (PESO / LGU jobs)
 * GET  /api/apply          — Provider fetches their own applied job IDs
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, ConflictError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { jobApplicationRepository } from "@/repositories/jobApplication.repository";
import { jobRepository } from "@/repositories";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const ApplySchema = z.object({
  jobId:        z.string().min(1),
  coverLetter:  z.string().min(20, "Cover letter must be at least 20 characters").max(2000),
  availability: z.string().min(1, "Availability is required").max(200),
  resumeUrl:    z.string().url().optional().or(z.literal("")),
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const body = await req.json();
  const parsed = ApplySchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  // Agency staff cannot apply to jobs independently
  await connectDB();
  const providerUser = await User.findById(user.userId, "agencyId").lean();
  if ((providerUser as { agencyId?: unknown } | null)?.agencyId) {
    throw new ForbiddenError(
      "Agency staff members cannot apply to jobs independently. Your agency owner will dispatch assignments to you."
    );
  }

  const { jobId, coverLetter, availability, resumeUrl } = parsed.data;

  // Verify job exists and is a PESO / LGU job
  const job = await jobRepository.findById(jobId);
  if (!job) throw new NotFoundError("Job");
  const j = job as unknown as { jobSource?: string; status: string };
  if (j.jobSource !== "peso" && j.jobSource !== "lgu") {
    throw new ValidationError("This job does not accept applications — use the quote system instead.");
  }
  if (j.status !== "open") {
    throw new ValidationError("This job is no longer accepting applications.");
  }

  // Duplicate check
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

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "provider");

  const applications = await jobApplicationRepository.findByApplicant(user.userId);
  const appliedJobIds = applications.map(
    (a) => (a as unknown as { jobId: { toString(): string } }).jobId.toString()
  );
  return NextResponse.json({ appliedJobIds });
});
