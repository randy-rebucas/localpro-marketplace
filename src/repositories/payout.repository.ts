import Payout from "@/models/Payout";
import type { PayoutDocument } from "@/models/Payout";
import { BaseRepository } from "./base.repository";

export class PayoutRepository extends BaseRepository<PayoutDocument> {
  constructor() {
    super(Payout);
  }

  async findByProvider(providerId: string): Promise<PayoutDocument[]> {
    await this.connect();
    return Payout.find({ providerId })
      .sort({ createdAt: -1 })
      .lean() as unknown as PayoutDocument[];
  }

  async findAllWithProvider(): Promise<PayoutDocument[]> {
    await this.connect();
    return Payout.find({})
      .sort({ createdAt: -1 })
      .populate("providerId", "name email")
      .lean() as unknown as PayoutDocument[];
  }

  /** Sum of approved/processing payouts for a provider (already paid or in-flight) */
  async sumPaidOut(providerId: string): Promise<number> {
    await this.connect();
    const result = await Payout.aggregate([
      {
        $match: {
          providerId: new (require("mongoose").Types.ObjectId)(providerId),
          status: { $in: ["pending", "processing", "completed"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /** Payout requests that have been in "pending" status since before `cutoff` */
  async findStalePending(cutoff: Date): Promise<PayoutDocument[]> {
    await this.connect();
    return Payout.find({ status: "pending", createdAt: { $lt: cutoff } })
      .lean() as unknown as PayoutDocument[];
  }
}

export const payoutRepository = new PayoutRepository();
