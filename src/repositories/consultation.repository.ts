import { FilterQuery, Types } from "mongoose";
import Consultation from "@/models/Consultation";
import type { ConsultationDocument } from "@/models/Consultation";
import { BaseRepository } from "./base.repository";

export class ConsultationRepository extends BaseRepository<ConsultationDocument> {
  constructor() {
    super(Consultation);
  }

  async findByInitiator(
    initiatorId: string,
    status?: string
  ): Promise<ConsultationDocument[]> {
    await this.connect();
    const filter: FilterQuery<ConsultationDocument> = {
      initiatorId: new Types.ObjectId(initiatorId),
    };
    if (status) {
      filter.status = status;
    }
    return Consultation.find(filter)
      .sort({ createdAt: -1 })
      .lean() as unknown as ConsultationDocument[];
  }

  async findByTarget(
    targetUserId: string,
    status?: string
  ): Promise<ConsultationDocument[]> {
    await this.connect();
    const filter: FilterQuery<ConsultationDocument> = {
      targetUserId: new Types.ObjectId(targetUserId),
    };
    if (status) {
      filter.status = status;
    }
    return Consultation.find(filter)
      .sort({ createdAt: -1 })
      .lean() as unknown as ConsultationDocument[];
  }

  async findPending(
    initiatorId: string,
    targetUserId: string
  ): Promise<ConsultationDocument | null> {
    await this.connect();
    return Consultation.findOne({
      initiatorId: new Types.ObjectId(initiatorId),
      targetUserId: new Types.ObjectId(targetUserId),
      status: { $in: ["pending", "accepted"] },
      expiresAt: { $gt: new Date() },
    }).lean() as unknown as ConsultationDocument | null;
  }

  async findByThreadId(threadId: string): Promise<ConsultationDocument | null> {
    await this.connect();
    return Consultation.findOne({
      conversationThreadId: threadId,
    }).lean() as unknown as ConsultationDocument | null;
  }

  async findExpired(beforeDate: Date): Promise<ConsultationDocument[]> {
    await this.connect();
    return Consultation.find({
      expiresAt: { $lt: beforeDate },
      status: { $in: ["pending", "accepted"] },
    }).lean() as unknown as ConsultationDocument[];
  }

  async countByInitiatorToday(initiatorId: string): Promise<number> {
    await this.connect();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return Consultation.countDocuments({
      initiatorId: new Types.ObjectId(initiatorId),
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });
  }

  async findPaginated(
    filter: FilterQuery<ConsultationDocument>,
    options: { page: number; limit: number }
  ): Promise<{
    data: ConsultationDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await this.connect();
    const skip = (options.page - 1) * options.limit;

    const [data, total] = await Promise.all([
      Consultation.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .lean() as unknown as Promise<ConsultationDocument[]>,
      Consultation.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  /** Accepted consultations whose updatedAt is older than the given threshold. */
  async findStaleAccepted(olderThan: Date): Promise<ConsultationDocument[]> {
    await this.connect();
    return Consultation.find({
      status: "accepted",
      updatedAt: { $lt: olderThan },
    }).lean() as unknown as ConsultationDocument[];
  }
}

export default ConsultationRepository;

export const consultationRepository = new ConsultationRepository();
