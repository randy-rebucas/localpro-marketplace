import { Types } from "mongoose";
import { consultationRepository, activityRepository, userRepository } from "@/repositories";
import { NotFoundError, ForbiddenError, ConflictError, UnprocessableError } from "@/lib/errors";
import { getAppSetting } from "@/lib/appSettings";
import type { TokenPayload } from "@/lib/auth";
import type { IConsultation, ConsultationType, ConsultationStatus } from "@/types";
import type { ConsultationDocument } from "@/models/Consultation";

export interface CreateConsultationInput {
  targetUserId: string;
  type: ConsultationType;
  title: string;
  description: string;
  location: string;
  coordinates?: { type: "Point"; coordinates: [number, number] };
  photos: string[];
}

export interface RespondToConsultationInput {
  action: "accept" | "decline";
  estimateAmount?: number;
  estimateNote?: string;
}

export interface ConvertToJobInput {
  title?: string;
  description?: string;
  budget: number;
  scheduleDate: string;
  specialInstructions?: string;
}

export interface PaginatedConsultations {
  data: ConsultationDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ConsultationService {
  async createConsultation(
    user: TokenPayload,
    input: CreateConsultationInput
  ): Promise<IConsultation> {
    // Validation: Cannot consult with self
    if (input.targetUserId === user.userId) {
      throw new UnprocessableError("Cannot request consultation with yourself");
    }

    // Validation: Photos required
    if (!input.photos || input.photos.length === 0) {
      throw new UnprocessableError("At least 1 photo is required");
    }

    if (input.photos.length > 5) {
      throw new UnprocessableError("Maximum 5 photos allowed");
    }

    // Validation: Title and description
    if (input.title.length < 5 || input.title.length > 200) {
      throw new UnprocessableError("Title must be between 5 and 200 characters");
    }

    if (input.description.length < 20 || input.description.length > 1000) {
      throw new UnprocessableError(
        "Description must be between 20 and 1000 characters"
      );
    }

    // Agency staff members cannot initiate consultations as independent providers
    if (user.role === "provider") {
      const providerUser = await userRepository.findById(user.userId);
      const agencyId = (providerUser as { agencyId?: unknown } | null)?.agencyId;
      if (agencyId) {
        throw new ForbiddenError(
          "Agency staff members cannot create consultations independently. Your agency owner manages client outreach."
        );
      }
    }

    // Rate limiting: Max consultations per day (configurable via limits.dailyConsultationLimit*)
    const count = await consultationRepository.countByInitiatorToday(user.userId);
    const [limitClient, limitProvider, expiryDays] = await Promise.all([
      getAppSetting<number>("limits.dailyConsultationLimitClient", 10),
      getAppSetting<number>("limits.dailyConsultationLimitProvider", 5),
      getAppSetting<number>("limits.consultationExpiryDays", 7),
    ]);
    const dailyLimit = user.role === "provider" ? (limitProvider as number) : (limitClient as number);
    if (count >= dailyLimit) {
      throw new UnprocessableError(
        `Daily consultation request limit reached (${dailyLimit} per day)`
      );
    }

    // Duplicate prevention: block if an active (pending or accepted) non-expired
    // consultation already exists between these two users
    const existing = await consultationRepository.findPending(
      user.userId,
      input.targetUserId
    );
    if (existing) {
      const statusLabel = existing.status === "accepted" ? "accepted" : "pending";
      throw new ConflictError(
        `You already have an ${statusLabel} consultation with this provider. Wait for it to conclude before requesting a new one.`
      );
    }

    // Create conversation thread ID
    const conversationThreadId = `consultation-${new Types.ObjectId().toString()}`;

    // Determine initiator role
    const initiatorRole = user.role === "client" ? "client" : "provider";

    // Set expiration based on configurable limits.consultationExpiryDays
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiryDays as number));

    const consultation = await consultationRepository.create({
      initiatorId: new Types.ObjectId(user.userId),
      targetUserId: new Types.ObjectId(input.targetUserId),
      initiatorRole,
      type: input.type,
      title: input.title.trim(),
      description: input.description.trim(),
      location: input.location.trim(),
      coordinates: input.coordinates || undefined,
      photos: input.photos,
      conversationThreadId,
      status: "pending" as const,
      estimateProvidedAt: null,
      estimateProvidedBy: null,
      estimateAmount: null,
      estimateNote: "",
      jobCreatedFromConsultationId: null,
      expiresAt,
    });

    // Log activity
    await activityRepository.log({
      userId: user.userId,
      eventType: "consultation_requested",
      metadata: {
        consultationId: consultation._id?.toString(),
        targetUserId: input.targetUserId,
        type: input.type,
      },
    });

    // Send notification
    const initiatorDoc = await userRepository.findById(user.userId) as { name?: string } | null;
    const initiatorName = initiatorDoc?.name || "A user";

    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: input.targetUserId,
      type: "consultation_request",
      title: `${initiatorName} requested a consultation`,
      message: `${input.type === "site_inspection" ? "Site inspection" : "Chat"} consultation: ${input.title}`,
      data: {
        consultationId: consultation._id?.toString(),
        initiatorId: user.userId,
      },
    });

    return consultation as unknown as IConsultation;
  }

  async getConsultation(
    user: TokenPayload,
    consultationId: string
  ): Promise<{ consultation: IConsultation; messages: any[] }> {
    const consultation = await consultationRepository.findById(consultationId);

    if (!consultation) {
      throw new NotFoundError("Consultation not found");
    }

    // Authorization: Only participants can view
    if (
      consultation.initiatorId.toString() !== user.userId &&
      consultation.targetUserId.toString() !== user.userId
    ) {
      throw new ForbiddenError("You do not have access to this consultation");
    }

    // Fetch messages from this consultation's thread
    const { messageRepository } = await import("@/repositories");
    const messages = await messageRepository.findThread(
      consultation.conversationThreadId
    );

    return {
      consultation: consultation as unknown as IConsultation,
      messages: messages || [],
    };
  }

  async listConsultations(
    user: TokenPayload,
    filters: {
      status?: ConsultationStatus | ConsultationStatus[];
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedConsultations> {
    const { status, page = 1, limit = 20 } = filters;

    // Build filter - show consultations where user is either initiator or target
    const filter: Record<string, unknown> = {
      $or: [
        { initiatorId: new Types.ObjectId(user.userId) },
        { targetUserId: new Types.ObjectId(user.userId) },
      ],
    };

    if (status) {
      filter.status = Array.isArray(status)
        ? { $in: status }
        : status;
    }

    return consultationRepository.findPaginated(filter, {
      page: Math.max(1, page),
      limit: Math.min(50, limit),
    });
  }

  async respondToConsultation(
    user: TokenPayload,
    consultationId: string,
    input: RespondToConsultationInput
  ): Promise<IConsultation> {
    const consultation = await consultationRepository.getDocById(consultationId);

    if (!consultation) {
      throw new NotFoundError("Consultation not found");
    }

    // Authorization: Only the target can respond
    if (consultation.targetUserId.toString() !== user.userId) {
      throw new ForbiddenError("Only the consultation target can respond");
    }

    // Status check: Must be pending
    if (consultation.status !== "pending") {
      throw new UnprocessableError(
        `Cannot respond to a ${consultation.status} consultation`
      );
    }

    if (input.action === "accept") {
      // Validation for estimate if accepting
      if (input.estimateAmount !== undefined && input.estimateNote !== undefined) {
        if (input.estimateAmount < 1) {
          throw new UnprocessableError("Estimate amount must be at least ₱1");
        }
        if (input.estimateNote.length < 20) {
          throw new UnprocessableError(
            "Estimate note must be at least 20 characters"
          );
        }
      }

      consultation.status = "accepted";
      if (input.estimateAmount !== undefined) {
        consultation.estimateAmount = input.estimateAmount;
        consultation.estimateNote = input.estimateNote || "";
        consultation.estimateProvidedAt = new Date();
        consultation.estimateProvidedBy = new Types.ObjectId(user.userId);
      }
    } else if (input.action === "decline") {
      consultation.status = "declined";
    }

    await consultation.save();

    // Log activity
    await activityRepository.log({
      userId: user.userId,
      eventType:
        input.action === "accept"
          ? "consultation_accepted"
          : "consultation_declined",
      metadata: {
        consultationId: consultationId,
        initiatorId: consultation.initiatorId.toString(),
      },
    });

    // Send notification to initiator
    const responderDoc = await userRepository.findById(user.userId) as { name?: string } | null;
    const responderName = responderDoc?.name || "Provider";

    const { notificationService } = await import("@/services/notification.service");
    if (input.action === "accept" && input.estimateAmount !== undefined) {
      await notificationService.push({
        userId: consultation.initiatorId.toString(),
        type: "estimate_provided",
        title: `${responderName} provided an estimate`,
        message: `₱${input.estimateAmount} - ${input.estimateNote?.substring(0, 50)}...`,
        data: {
          consultationId: consultationId,
          estimateAmount: input.estimateAmount,
        },
      });
    } else if (input.action === "accept") {
      // Accepted without an estimate — still notify the client
      await notificationService.push({
        userId: consultation.initiatorId.toString(),
        type: "consultation_accepted",
        title: `${responderName} accepted your consultation`,
        message: `Your consultation "${consultation.title}" has been accepted. You can now convert it to a job.`,
        data: { consultationId: consultationId },
      });
    } else if (input.action === "decline") {
      await notificationService.push({
        userId: consultation.initiatorId.toString(),
        type: "new_message",
        title: `${responderName} declined your consultation`,
        message: consultation.title,
        data: {
          consultationId: consultationId,
        },
      });
    }

    return consultation.toObject() as unknown as IConsultation;
  }

  async convertToJob(
    user: TokenPayload,
    consultationId: string,
    input: ConvertToJobInput
  ): Promise<{ job: any; consultation: IConsultation }> {
    const consultation = await consultationRepository.getDocById(consultationId);

    if (!consultation) {
      throw new NotFoundError("Consultation not found");
    }

    // Authorization: Only the initiator can convert
    if (consultation.initiatorId.toString() !== user.userId) {
      throw new ForbiddenError(
        "Only the consultation initiator can convert to job"
      );
    }

    // Status check: Must be accepted
    if (consultation.status !== "accepted") {
      throw new UnprocessableError(
        "Can only convert accepted consultations to jobs"
      );
    }

    // Prevent re-conversion
    if (consultation.jobCreatedFromConsultationId) {
      throw new ConflictError("This consultation has already been converted to a job");
    }

    // Validation: Budget is required
    if (input.budget < 1) {
      throw new UnprocessableError("Budget must be at least ₱1");
    }

    // Create the job using JobService
    const { JobService } = await import("@/services/job.service");
    const jobService = new JobService();

    // Resolve job category: use the first active category, fall back to "General"
    const { categoryRepository } = await import("@/repositories");
    const activeCategories = await categoryRepository.findActive();
    const resolvedCategory = (activeCategories[0] as unknown as { name?: string })?.name ?? "General";

    const jobInput = {
      title: input.title || consultation.title,
      category: resolvedCategory,
      description: input.description || consultation.description,
      budget: input.budget,
      location: consultation.location,
      scheduleDate: input.scheduleDate,
      specialInstructions: input.specialInstructions,
      beforePhoto: consultation.photos,
      coordinates: consultation.coordinates ?? undefined,
      // Note: For consultations, we don't immediately assign provider
      // Client can invite the consultation provider manually if desired
    };

    const job = await jobService.createJob(user, jobInput);

    // Auto-create an accepted quote on behalf of the consultation provider
    const { quoteRepository, jobRepository } = await import("@/repositories");

    const rawNote = consultation.estimateNote ?? "";
    const quoteMessage =
      rawNote.length >= 20
        ? rawNote
        : `Consultation estimate. ${rawNote}`.padEnd(20, ".");

    const scheduleLabel = new Date(input.scheduleDate).toLocaleDateString(
      "en-PH",
      { year: "numeric", month: "long", day: "numeric" }
    );

    await quoteRepository.create({
      jobId: new Types.ObjectId(job._id),
      providerId: consultation.targetUserId,
      proposedAmount: consultation.estimateAmount ?? input.budget,
      timeline: `Scheduled for ${scheduleLabel}`,
      message: quoteMessage,
      status: "accepted",
    });

    // Assign the provider on the job and mark it as assigned
    await jobRepository.updateById(job._id.toString(), {
      providerId: consultation.targetUserId,
      status: "assigned",
    });

    // Update consultation
    consultation.status = "converted";
    consultation.jobCreatedFromConsultationId = new Types.ObjectId(job._id);
    await consultation.save();

    // Log activity
    await activityRepository.log({
      userId: user.userId,
      eventType: "consultation_converted_to_job",
      jobId: job._id.toString(),
      metadata: {
        consultationId: consultationId,
      },
    });

    return {
      job,
      consultation: consultation.toObject() as unknown as IConsultation,
    };
  }

  async expireOldConsultations(): Promise<number> {
    const now = new Date();
    const expiredConsultations =
      await consultationRepository.findExpired(now);

    if (expiredConsultations.length === 0) {
      return 0;
    }

    const expiredIds = expiredConsultations.map((c) => c._id);

    await consultationRepository.updateMany(
      { _id: { $in: expiredIds } },
      { status: "expired" }
    );

    // Send notifications
    const { notificationService } = await import("@/services/notification.service");
    for (const consultation of expiredConsultations) {
      await notificationService.push({
        userId: consultation.initiatorId.toString(),
        type: "consultation_expired",
        title: "Consultation request expired",
        message: `Your consultation request "${consultation.title}" has expired after 7 days`,
        data: {
          consultationId: consultation._id?.toString(),
        },
      });
    }

    return expiredConsultations.length;
  }

  /**
   * Flags accepted consultations that have not been converted to a job
   * within 7 days. Sends an admin activity log and nudge notifications.
   */
  async flagStaleAcceptedConsultations(): Promise<number> {
    const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stale = await consultationRepository.findStaleAccepted(threshold);

    if (stale.length === 0) return 0;

    const { notificationService } = await import("@/services/notification.service");

    for (const consultation of stale) {
      // Admin activity log entry
      await activityRepository.log({
        userId: consultation.initiatorId.toString(),
        eventType: "consultation_stale_accepted",
        metadata: {
          consultationId: consultation._id?.toString(),
          consultationTitle: consultation.title,
          acceptedAt: consultation.updatedAt,
          daysSinceAccepted: Math.floor(
            (Date.now() - new Date(consultation.updatedAt).getTime()) / 86_400_000
          ),
        },
      });

      // Nudge the client to convert or close
      await notificationService.push({
        userId: consultation.initiatorId.toString(),
        type: "consultation_stale",
        title: "Ready to book your service?",
        message: `Your accepted consultation "${consultation.title}" has been open for over 7 days. Convert it to a job or close it.`,
        data: { consultationId: consultation._id?.toString() },
      });
    }

    return stale.length;
  }
}

export default ConsultationService;
