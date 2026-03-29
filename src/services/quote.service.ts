import {
  quoteRepository,
  jobRepository,
  activityRepository,
  userRepository,
} from "@/repositories";
import { getAppSetting } from "@/lib/appSettings";
import { pushStatusUpdate, pushStatusUpdateMany } from "@/lib/events";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  UnprocessableError,
  assertObjectId,
} from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";

export interface CreateQuoteInput {
  jobId: string;
  proposedAmount: number;
  laborCost?: number | null;
  materialsCost?: number | null;
  timeline: string;
  milestones?: { description: string; amount: number }[];
  notes?: string | null;
  proposalDocUrl?: string | null;
  sitePhotos?: string[];
  message: string;
}

export class QuoteService {
  async submitQuote(user: TokenPayload, input: CreateQuoteInput) {
    const job = await jobRepository.getDocById(input.jobId);
    if (!job) throw new NotFoundError("Job");

    const j = job as unknown as {
      status: string;
      clientId: { toString(): string };
      title: string;
    };

    if (j.status !== "open") throw new UnprocessableError("This job is not accepting quotes");
    if (j.clientId.toString() === user.userId) {
      throw new ForbiddenError("You cannot quote on your own job");
    }

    // ── Agency staff check ──────────────────────────────────────────────────
    // Staff workers belonging to an agency must not quote independently.
    // Jobs for agency staff are dispatched by the agency owner, not self-submitted.
    //
    // L22: providerUser must exist — if the account was deleted between auth token
    // verification and this call, reject immediately rather than silently skipping
    // the agency check (which could allow a deleted agency worker to submit quotes).
    const providerUser = await userRepository.findById(user.userId);
    if (!providerUser) throw new ForbiddenError("User account not found.");
    const agencyId = (providerUser as { agencyId?: unknown } | null)?.agencyId;
    if (agencyId) {
      throw new ForbiddenError(
        "You are a member of an agency. Your agency owner dispatches jobs to you — you cannot quote independently."
      );
    }

    const existing = await quoteRepository.findPendingByProvider(input.jobId, user.userId);
    if (existing) throw new ConflictError("You have already submitted a quote for this job");

    // ── Platform limits enforcement ─────────────────────────────────────────
    const [maxQuotes, validityDays] = await Promise.all([
      getAppSetting("limits.maxQuotesPerJob", 5),
      getAppSetting("limits.quoteValidityDays", 7),
    ]);

    const quoteCount = await quoteRepository.countForJob(input.jobId);
    if (quoteCount >= (maxQuotes as number)) {
      throw new UnprocessableError(`This job has reached the maximum number of quotes (${maxQuotes})`);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (validityDays as number));

    const quote = await quoteRepository.create({
      jobId:           input.jobId,
      proposedAmount:  input.proposedAmount,
      laborCost:       input.laborCost,
      materialsCost:   input.materialsCost,
      timeline:        input.timeline,
      milestones:      input.milestones,
      notes:           input.notes,
      proposalDocUrl:  input.proposalDocUrl,
      sitePhotos:      input.sitePhotos,
      message:         input.message,
      providerId:      user.userId,
      expiresAt,
    });

    await activityRepository.log({
      userId: user.userId,
      eventType: "quote_submitted",
      jobId: input.jobId,
      metadata: { proposedAmount: input.proposedAmount },
    });

    // Notify client via notification service (SSE + email)
    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: j.clientId.toString(),
      type: "quote_received",
      title: "New quote received",
      message: `A provider submitted a quote of ₱${input.proposedAmount.toLocaleString()} for "${j.title}".`,
      data: { jobId: input.jobId, quoteId: quote._id!.toString() },
    });
    // Signal the client's job detail page to refresh (new quote appeared)
    pushStatusUpdate(j.clientId.toString(), { entity: "job", id: input.jobId });

    return quote;
  }

  async acceptQuote(user: TokenPayload, quoteId: string) {
    assertObjectId(quoteId, "quoteId");

    // ── 1. Load and pre-validate quote ────────────────────────────────────
    const quote = await quoteRepository.getDocById(quoteId);
    if (!quote) throw new NotFoundError("Quote");

    const q = quote as unknown as {
      status: string;
      jobId: { toString(): string };
      providerId: { toString(): string } | null;
      proposedAmount: number;
      expiresAt?: Date | null;
      _id: { toString(): string };
    };

    if (q.status !== "pending") throw new UnprocessableError("This quote has already been processed");

    // Reject expired quotes (L10)
    if (q.expiresAt && q.expiresAt < new Date()) {
      throw new UnprocessableError("This quote has expired");
    }

    const job = await jobRepository.getDocById(q.jobId.toString());
    if (!job) throw new NotFoundError("Job");

    const j = job as unknown as {
      clientId: { toString(): string };
      status: string;
      title: string;
      providerId: unknown;
      scheduleDate?: Date;
      _id: { toString(): string };
    };

    if (j.clientId.toString() !== user.userId) throw new ForbiddenError();
    if (j.status !== "open") throw new UnprocessableError("Job is no longer accepting quotes");

    if (q.providerId) {
      const provider = await userRepository.findById(q.providerId.toString());
      const approvalStatus = (provider as { approvalStatus?: string } | null)?.approvalStatus;
      if (!provider || approvalStatus !== "approved") {
        throw new UnprocessableError("This provider is no longer eligible to accept jobs");
      }

      // ── Capacity check (hard block) ──────────────────────────────────────
      const { checkCapacity, checkScheduleConflict } = await import("@/lib/scheduleConflict");
      const capacity = await checkCapacity(q.providerId.toString());
      if (capacity.atCapacity) {
        throw new UnprocessableError(
          `Provider has reached their maximum of ${capacity.max} concurrent jobs`
        );
      }

      // ── Schedule conflict check (warning — logged but not blocking) ─────
      if (j.scheduleDate) {
        const conflict = await checkScheduleConflict(q.providerId.toString(), new Date(j.scheduleDate));
        if (conflict.hasConflict) {
          const titles = conflict.conflictingJobs.map((c) => c.title).join(", ");
          console.warn(
            `[ScheduleConflict] Provider ${q.providerId.toString()} has overlapping jobs on ${new Date(j.scheduleDate).toLocaleDateString()}: ${titles}`
          );
        }
      }
    }

    // ── 2. Atomically accept quote (CAS: status must still be "pending") ──
    const acceptedQuote = await quoteRepository.atomicAccept(quoteId);
    if (!acceptedQuote) {
      throw new ConflictError("Quote was already accepted or rejected by a concurrent request");
    }

    await quoteRepository.rejectOthers(q.jobId.toString(), q._id.toString());

    // ── 3. Atomically assign job (also updates budget to accepted amount — H8) ──
    const acceptedJob = await jobRepository.atomicAssignProvider(
      j._id.toString(),
      q.providerId?.toString() ?? "",
      q.proposedAmount
    );
    if (!acceptedJob) {
      // Rollback quote acceptance — job was concurrently modified
      await quoteRepository.revertAccepted(quoteId);
      throw new ConflictError("Job is no longer available for assignment");
    }

    await activityRepository.log({
      userId: user.userId,
      eventType: "quote_accepted",
      jobId: j._id.toString(),
      metadata: { quoteId: q._id.toString(), providerId: q.providerId?.toString() ?? "" },
    });

    // Notify provider via notification service (SSE + email)
    if (q.providerId) {
      const { notificationService } = await import("@/services/notification.service");
      await notificationService.push({
        userId: q.providerId.toString(),
        type: "quote_accepted",
        title: "Your quote was accepted!",
        message: `The client accepted your quote for "${j.title}". They'll fund escrow to get started.`,
        data: { jobId: j._id.toString(), quoteId: q._id.toString() },
      });
    }
    // Push status updates so both parties' pages refresh
    pushStatusUpdateMany(
      [j.clientId.toString(), q.providerId?.toString()].filter(Boolean) as string[],
      { entity: "job", id: j._id.toString(), status: "assigned" }
    );
    if (q.providerId) {
      pushStatusUpdate(q.providerId.toString(), { entity: "quote", id: q._id.toString(), status: "accepted" });
    }

    return { quote: acceptedQuote, job: acceptedJob };
  }

  async rejectQuote(user: TokenPayload, quoteId: string) {
    const quote = await quoteRepository.getDocById(quoteId);
    if (!quote) throw new NotFoundError("Quote");

    const q = quote as unknown as {
      status: string;
      jobId: { toString(): string };
      providerId: { toString(): string } | null;
      save(): Promise<void>;
    };

    if (q.status !== "pending") throw new UnprocessableError("This quote has already been processed");

    const job = await jobRepository.findById(q.jobId.toString());
    if (!job) throw new NotFoundError("Job");
    if ((job as { clientId: { toString(): string } }).clientId.toString() !== user.userId) {
      throw new ForbiddenError();
    }

    q.status = "rejected";
    await quote.save();

    // Notify provider via notification service (SSE + email)
    if (q.providerId) {
      const { notificationService } = await import("@/services/notification.service");
      await notificationService.push({
        userId: q.providerId.toString(),
        type: "quote_rejected",
        title: "Quote not selected",
        message: "The client chose a different provider for this job.",
        data: { jobId: q.jobId.toString(), quoteId },
      });
      pushStatusUpdate(q.providerId.toString(), { entity: "quote", id: quoteId, status: "rejected" });
    }

    return quote;
  }

  async reviseQuote(
    user: TokenPayload,
    quoteId: string,
    input: {
      proposedAmount?: number;
      timeline?: string;
      message?: string;
      milestones?: { description: string; amount: number }[];
      laborCost?: number | null;
      materialsCost?: number | null;
    }
  ) {
    assertObjectId(quoteId, "quoteId");
    const quote = await quoteRepository.getDocById(quoteId);
    if (!quote) throw new NotFoundError("Quote");

    const q = quote as unknown as {
      status: string;
      providerId: { toString(): string };
      jobId: { toString(): string };
      revisionCount: number;
      _id: { toString(): string };
      save(): Promise<unknown>;
    };

    // Only the original provider can revise
    if (q.providerId.toString() !== user.userId) throw new ForbiddenError();

    // Only pending quotes can be revised
    if (q.status !== "pending") {
      throw new UnprocessableError("Only pending quotes can be revised");
    }

    // Apply updates
    const updates: Record<string, unknown> = { revisedAt: new Date() };
    if (input.proposedAmount !== undefined) updates.proposedAmount = input.proposedAmount;
    if (input.timeline !== undefined) updates.timeline = input.timeline;
    if (input.message !== undefined) updates.message = input.message;
    if (input.milestones !== undefined) updates.milestones = input.milestones;
    if (input.laborCost !== undefined) updates.laborCost = input.laborCost;
    if (input.materialsCost !== undefined) updates.materialsCost = input.materialsCost;

    const updated = await quoteRepository.atomicRevise(q._id.toString(), updates);
    if (!updated) throw new ConflictError("Quote was modified by a concurrent request");

    await activityRepository.log({
      userId: user.userId,
      eventType: "quote_revised" as never,
      jobId: q.jobId.toString(),
      metadata: { quoteId: q._id.toString(), revisionCount: (q.revisionCount ?? 0) + 1 },
    });

    // Notify the client
    const job = await jobRepository.findById(q.jobId.toString());
    if (job) {
      const j = job as unknown as { clientId: { toString(): string }; title: string };
      const { notificationService } = await import("@/services/notification.service");
      await notificationService.push({
        userId: j.clientId.toString(),
        type: "quote_revised" as never,
        title: "Provider revised their quote",
        message: `A provider revised their quote for "${j.title}". Check the updated details.`,
        data: { jobId: q.jobId.toString(), quoteId: q._id.toString() },
      });
      pushStatusUpdate(j.clientId.toString(), { entity: "job", id: q.jobId.toString() });
    }

    return updated;
  }

  async getQuotesForJob(user: TokenPayload, jobId: string) {
    const job = await jobRepository.findById(jobId);
    if (!job) throw new NotFoundError("Job");

    if (
      user.role === "client" &&
      (job as { clientId: { toString(): string } }).clientId.toString() !== user.userId
    ) {
      throw new ForbiddenError();
    }

    return quoteRepository.findForJob(jobId);
  }
}

export const quoteService = new QuoteService();
