import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { jobRepository, paymentRepository } from "@/repositories";
import { NotFoundError, ForbiddenError, UnprocessableError, ValidationError, assertObjectId } from "@/lib/errors";
import type { IJob, IMilestone } from "@/types";

const AddMilestoneSchema = z.object({
  title:       z.string().min(3).max(100),
  amount:      z.number().positive("Amount must be positive"),
  description: z.string().max(500).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/jobs/:id/milestones
 * Returns the milestone list for a job. Accessible by client, provider, or admin.
 */
export const GET = withHandler(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  assertObjectId(id, "jobId");
  const user = await requireUser();

  const jobDoc = await jobRepository.getDocById(id);
  if (!jobDoc) throw new NotFoundError("Job");

  const job = jobDoc as unknown as IJob & {
    clientId: { toString(): string };
    providerId?: { toString(): string } | null;
  };

  const isClient   = job.clientId.toString()     === user.userId;
  const isProvider = job.providerId?.toString()   === user.userId;
  const isAdmin    = user.role === "admin";
  if (!isClient && !isProvider && !isAdmin) throw new ForbiddenError();

  return Response.json({ milestones: job.milestones ?? [] });
});

/**
 * POST /api/jobs/:id/milestones
 * Adds a new pending milestone to a funded job.
 * Only the client who owns the job may add milestones.
 */
export const POST = withHandler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  assertObjectId(id, "jobId");
  const user = await requireUser();

  const body = await req.json();
  const parsed = AddMilestoneSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const jobDoc = await jobRepository.getDocById(id);
  if (!jobDoc) throw new NotFoundError("Job");

  const job = jobDoc as unknown as IJob & {
    _id: { toString(): string };
    clientId: { toString(): string };
    milestones: IMilestone[];
    save(): Promise<void>;
  };

  if (job.clientId.toString() !== user.userId) throw new ForbiddenError();

  if (job.escrowStatus !== "funded") {
    throw new UnprocessableError("Milestones can only be added once escrow is funded");
  }

  if (!["assigned", "in_progress"].includes(job.status)) {
    throw new UnprocessableError("Milestones can only be added to active jobs");
  }

  // Guard: total milestone amounts must not exceed the funded escrow amount
  const fundedMap = await paymentRepository.findAmountsByJobIds([id]);
  const fundedAmount = fundedMap.get(id) ?? job.budget;

  const existing = job.milestones ?? [];
  const totalCommitted = existing.reduce((sum, m) => sum + m.amount, 0);
  const newTotal = totalCommitted + parsed.data.amount;

  if (newTotal > fundedAmount) {
    throw new UnprocessableError(
      `Adding ₱${parsed.data.amount.toLocaleString()} would exceed the funded escrow amount of ₱${fundedAmount.toLocaleString()} (already committed: ₱${totalCommitted.toLocaleString()})`
    );
  }

  existing.push({
    title:       parsed.data.title,
    amount:      parsed.data.amount,
    description: parsed.data.description ?? "",
    status:      "pending",
    releasedAt:  undefined,
  } as unknown as IMilestone);

  (jobDoc as unknown as { milestones: IMilestone[] }).milestones = existing;
  await jobDoc.save();

  return Response.json(
    { milestone: existing[existing.length - 1] },
    { status: 201 }
  );
});
