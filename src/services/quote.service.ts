import { quoteRepository, jobRepository, activityRepository } from "@/repositories";
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
    if ((job as { status: string }).status !== "open") {
      throw new UnprocessableError("This job is not accepting quotes");
    }
    if ((job as { clientId: { toString(): string } }).clientId.toString() === user.userId) {
      throw new ForbiddenError("You cannot quote on your own job");
    }

    const existing = await quoteRepository.findPendingByProvider(input.jobId, user.userId);
    if (existing) throw new ConflictError("You have already submitted a quote for this job");

    const quote = await quoteRepository.create({
      ...input,
      providerId: user.userId,
    });

    await activityRepository.log({
      userId: user.userId,
      eventType: "quote_submitted",
      jobId: input.jobId,
      metadata: { proposedAmount: input.proposedAmount },
    });

    return quote;
  }

  async acceptQuote(user: TokenPayload, quoteId: string) {
    const quote = await quoteRepository.getDocById(quoteId);
    if (!quote) throw new NotFoundError("Quote");

    const q = quote as unknown as {
      status: string;
      jobId: { toString(): string };
      providerId: { toString(): string };
      _id: { toString(): string };
      save(): Promise<void>;
    };

    if (q.status !== "pending") {
      throw new UnprocessableError("This quote has already been processed");
    }

    const job = await jobRepository.getDocById(q.jobId.toString());
    if (!job) throw new NotFoundError("Job");

    const j = job as unknown as {
      clientId: { toString(): string };
      status: string;
      providerId: unknown;
      _id: { toString(): string };
      save(): Promise<void>;
    };

    if (j.clientId.toString() !== user.userId) throw new ForbiddenError();
    if (j.status !== "open") {
      throw new UnprocessableError("Job is no longer accepting quotes");
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
      metadata: { quoteId: q._id.toString(), providerId: q.providerId.toString() },
    });

    return { quote, job };
  }

  async rejectQuote(user: TokenPayload, quoteId: string) {
    const quote = await quoteRepository.getDocById(quoteId);
    if (!quote) throw new NotFoundError("Quote");

    const q = quote as unknown as {
      status: string;
      jobId: { toString(): string };
      save(): Promise<void>;
    };

    if (q.status !== "pending") {
      throw new UnprocessableError("This quote has already been processed");
    }

    const job = await jobRepository.findById(q.jobId.toString());
    if (!job) throw new NotFoundError("Job");

    if ((job as { clientId: { toString(): string } }).clientId.toString() !== user.userId) {
      throw new ForbiddenError();
    }

    q.status = "rejected";
    await quote.save();
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
