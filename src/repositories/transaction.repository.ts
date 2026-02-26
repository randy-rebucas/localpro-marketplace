import Transaction from "@/models/Transaction";
import type { TransactionDocument } from "@/models/Transaction";
import { BaseRepository } from "./base.repository";

export class TransactionRepository extends BaseRepository<TransactionDocument> {
  constructor() {
    super(Transaction);
  }

  async findCompleted(): Promise<Array<{ amount: number; commission: number }>> {
    await this.connect();
    return Transaction.find({ status: "completed" })
      .select("amount commission")
      .lean() as unknown as Array<{ amount: number; commission: number }>;
  }

  async setPending(jobId: string, status: "completed" | "refunded"): Promise<void> {
    await this.updateMany({ jobId, status: "pending" } as never, { status });
  }
}

export const transactionRepository = new TransactionRepository();
