import {
  quoteRepository,
  jobRepository,
  activityRepository,
  userRepository,
} from "@/repositories";
import { pushStatusUpdate, pushStatusUpdateMany } from "@/lib/events";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  UnprocessableError,
} from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";

export interface CreateQuoteInput {
  jobId: string;
  proposedAmount: number;
  timeline: string;
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

    const existing = await quoteRepository.findPendingByProvider(input.jobId, user.userId);
    if (existing) throw new ConflictError("You have already submitted a quote for this job");

    const quote = await quoteRepository.create({ ...input, providerId: user.userId });

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
    const quote = await quoteRepository.getDocById(quoteId);
    if (!quote) throw new NotFoundError("Quote");

    const q = quote as unknown as {
      status: string;
      jobId: { toString(): string };
      providerId: { toString(): string } | null;
      _id: { toString(): string };
      save(): Promise<void>;
    };

    if (q.status !== "pending") throw new UnprocessableError("This quote has already been processed");

    const job = await jobRepository.getDocById(q.jobId.toString());
    if (!job) throw new NotFoundError("Job");

    const j = job as unknown as {
      clientId: { toString(): string };
      status: string;
      title: string;
      providerId: unknown;
      _id: { toString(): string };
      save(): Promise<void>;
    };

    if (j.clientId.toString() !== user.userId) throw new ForbiddenError();
    if (j.status !== "open") throw new UnprocessableError("Job is no longer accepting quotes");

    if (q.providerId) {
      const provider = await userRepository.findById(q.providerId.toString());
      const approvalStatus = (provider as { approvalStatus?: string } | null)?.approvalStatus;
      if (!provider || approvalStatus !== "approved") {
        throw new UnprocessableError("This provider is no longer eligible to accept jobs");
      }
    }

    q.status = "accepted";
    await quote.save();

    await quoteRepository.rejectOthers(q.jobId.toString(), q._id.toString());

    j.providerId = q.providerId;
    j.status = "assigned";
    await job.save();

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

    return { quote, job };
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
