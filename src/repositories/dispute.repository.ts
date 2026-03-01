import Dispute from "@/models/Dispute";
import type { DisputeDocument } from "@/models/Dispute";
import { FilterQuery } from "mongoose";
import { BaseRepository } from "./base.repository";
import type { DisputeStatus } from "@/types";

export class DisputeRepository extends BaseRepository<DisputeDocument> {
  constructor() {
    super(Dispute);
  }

  async findWithPopulation(
    filter: FilterQuery<DisputeDocument>
  ): Promise<DisputeDocument[]> {
    await this.connect();
    return Dispute.find(filter)
      .populate("jobId", "title status")
      .populate("raisedBy", "name email")
      .sort({ createdAt: -1 })
      .lean() as unknown as DisputeDocument[];
  }

  async findByIdPopulated(id: string): Promise<DisputeDocument | null> {
    await this.connect();
    return Dispute.findById(id)
      .populate("jobId")
      .populate("raisedBy", "name email role")
      .lean() as unknown as DisputeDocument | null;
  }

  async countOpen(): Promise<number> {
    return this.count({ status: { $in: ["open", "investigating"] } } as never);
  }

  /** Disputes still open/investigating with no status change since before cutoffDate. */
  async findStale(cutoffDate: Date): Promise<DisputeDocument[]> {
    await this.connect();
    return Dispute.find({
      status: { $in: ["open", "investigating"] },
      updatedAt: { $lt: cutoffDate },
    })
      .populate("jobId", "title")
      .lean() as unknown as DisputeDocument[];
  }

  /** Active disputes (open + investigating) with jobId title/budget/escrowStatus and raisedBy name/email/role. */
  async findActiveWithRefs(): Promise<Array<{
    _id: unknown; reason: string; status: DisputeStatus; createdAt: Date;
    evidence: string[];
    jobId: { _id: unknown; title: string; budget: number; escrowStatus: string } | null;
    raisedBy: { name: string; email: string; role: string };
  }>> {
    await this.connect();
    return Dispute.find({ status: { $in: ["open", "investigating"] } })
      .sort({ createdAt: -1 })
      .populate("jobId", "title budget escrowStatus")
      .populate("raisedBy", "name email role")
      .lean() as never;
  }

  /** Most recent dispute for a job, with only fields needed for the timeline UI. */
  async findLatestByJobId(jobId: string): Promise<{
    _id: string;
    status: string;
    reason: string;
    resolutionNotes?: string;
    createdAt: Date;
  } | null> {
    await this.connect();
    return Dispute.findOne({ jobId })
      .sort({ createdAt: -1 })
      .select("status reason resolutionNotes createdAt")
      .lean() as never;
  }
}

export const disputeRepository = new DisputeRepository();
