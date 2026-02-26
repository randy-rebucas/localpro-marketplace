import Dispute from "@/models/Dispute";
import type { DisputeDocument } from "@/models/Dispute";
import { FilterQuery } from "mongoose";
import { BaseRepository } from "./base.repository";

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
}

export const disputeRepository = new DisputeRepository();
