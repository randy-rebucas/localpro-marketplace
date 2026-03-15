import mongoose from "mongoose";
import Wallet from "@/models/Wallet";
import type { WalletDocument } from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";
import type { WalletTransactionDocument, WalletTxType } from "@/models/WalletTransaction";
import WalletWithdrawal from "@/models/WalletWithdrawal";
import type { WalletWithdrawalDocument, WalletWithdrawalStatus } from "@/models/WalletWithdrawal";
import { connectDB } from "@/lib/db";

export class WalletRepository {
  // ── Balance ──────────────────────────────────────────────────────────────

  async findOrCreate(userId: string): Promise<WalletDocument> {
    await connectDB();
    const doc = await Wallet.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $setOnInsert: { userId: new mongoose.Types.ObjectId(userId), balance: 0 } },
      { upsert: true, new: true }
    ).lean() as unknown as WalletDocument;
    return doc;
  }

  async getBalance(userId: string): Promise<number> {
    await connectDB();
    const doc = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    return (doc as { balance?: number } | null)?.balance ?? 0;
  }

  /**
   * Atomically updates balance and records a wallet transaction in a
   * MongoDB multi-document session to prevent partial writes.
   * Returns the new balance.
   */
  async applyTransaction(
    userId: string,
    delta: number,           // positive = credit, negative = debit
    type: WalletTxType,
    description: string,
    opts?: { jobId?: string; refId?: string }
  ): Promise<{ newBalance: number; txDoc: WalletTransactionDocument }> {
    await connectDB();

    const session = await mongoose.startSession();
    let newBalance = 0;
    let txDoc!: WalletTransactionDocument;

    try {
      await session.withTransaction(async () => {
        const updated = await Wallet.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId) },
          {
            $inc: { balance: delta },
            $setOnInsert: { userId: new mongoose.Types.ObjectId(userId) },
          },
          { upsert: true, new: true, session }
        ).lean() as { balance: number };

        newBalance = updated.balance;

        const [created] = await WalletTransaction.create(
          [{
            userId:       new mongoose.Types.ObjectId(userId),
            type,
            amount:       Math.abs(delta),
            balanceAfter: newBalance,
            description,
            jobId:  opts?.jobId  ? new mongoose.Types.ObjectId(opts.jobId)  : null,
            refId:  opts?.refId  ?? null,
          }],
          { session }
        );
        txDoc = created as unknown as WalletTransactionDocument;
      });
    } finally {
      await session.endSession();
    }

    return { newBalance, txDoc };
  }

  /**
   * Reserve (lock) funds for a pending withdrawal so they can't be
   * double-spent while the withdrawal is in flight.
   * Throws if available balance (balance - reservedAmount) < amount.
   */
  async reserveBalance(userId: string, amount: number): Promise<void> {
    await connectDB();
    const result = await Wallet.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        $expr: { $gte: [{ $subtract: ["$balance", "$reservedAmount"] }, amount] },
      },
      { $inc: { reservedAmount: amount } },
      { new: true }
    );
    if (!result) {
      throw new Error("Insufficient available balance to reserve");
    }
  }

  /** Release a reservation without committing it (e.g. withdrawal rejected). */
  async releaseReservation(userId: string, amount: number): Promise<void> {
    await connectDB();
    await Wallet.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $inc: { reservedAmount: -amount } }
    );
  }

  /** Commit a reservation: deduct both balance and reservedAmount (withdrawal completed). */
  async commitReservation(userId: string, amount: number): Promise<void> {
    await connectDB();
    await Wallet.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $inc: { balance: -amount, reservedAmount: -amount } }
    );
  }

  // ── Transactions history ──────────────────────────────────────────────────

  async listTransactions(userId: string, page = 1, limit = 20): Promise<WalletTransactionDocument[]> {
    await connectDB();
    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
    return WalletTransaction.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(100, Math.max(1, limit)))
      .lean() as unknown as WalletTransactionDocument[];
  }

  // ── Withdrawals ───────────────────────────────────────────────────────────

  async createWithdrawal(data: {
    userId: string;
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
  }): Promise<WalletWithdrawalDocument> {
    await connectDB();
    return WalletWithdrawal.create({
      userId: new mongoose.Types.ObjectId(data.userId),
      amount: data.amount,
      status: "pending",
      bankName:      data.bankName,
      accountNumber: data.accountNumber,
      accountName:   data.accountName,
    }) as unknown as WalletWithdrawalDocument;
  }

  async listWithdrawals(userId: string): Promise<WalletWithdrawalDocument[]> {
    await connectDB();
    return WalletWithdrawal.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean() as unknown as WalletWithdrawalDocument[];
  }

  async findWithdrawalById(id: string): Promise<WalletWithdrawalDocument | null> {
    await connectDB();
    return WalletWithdrawal.findById(id).lean() as unknown as WalletWithdrawalDocument | null;
  }

  async updateWithdrawalStatus(
    id: string,
    status: WalletWithdrawalStatus,
    notes?: string
  ): Promise<WalletWithdrawalDocument | null> {
    await connectDB();
    const update: Record<string, unknown> = { status };
    if (notes !== undefined) update.notes = notes;
    if (status === "processing" || status === "completed") update.processedAt = new Date();
    return WalletWithdrawal.findByIdAndUpdate(id, update, { new: true }).lean() as unknown as WalletWithdrawalDocument | null;
  }

  // Admin: all pending withdrawal requests
  async listAllWithdrawals(): Promise<WalletWithdrawalDocument[]> {
    await connectDB();
    return WalletWithdrawal.find({})
      .sort({ createdAt: -1 })
      .populate("userId", "name email")
      .lean() as unknown as WalletWithdrawalDocument[];
  }

  async setWithdrawalLedgerJournalId(id: string, journalId: string): Promise<void> {
    await connectDB();
    await WalletWithdrawal.findByIdAndUpdate(id, { ledgerJournalId: journalId });
  }

  /** Stamp a ledger journal ID onto an existing WalletTransaction record. */
  async setTransactionLedgerJournalId(txId: string, journalId: string): Promise<void> {
    await connectDB();
    await WalletTransaction.findByIdAndUpdate(txId, { ledgerJournalId: journalId });
  }

  /**
   * Atomically commits a pending withdrawal reservation:
   *   - decrements both `balance` and `reservedAmount` on the Wallet
   *   - creates a `WalletTransaction` record of type "withdrawal"
   * Used when an admin marks a wallet withdrawal as completed.
   */
  async commitReservationWithTx(
    userId: string,
    amount: number,
    description: string,
    opts?: { refId?: string }
  ): Promise<{ txDoc: WalletTransactionDocument }> {
    await connectDB();

    const session = await mongoose.startSession();
    let txDoc!: WalletTransactionDocument;
    let newBalance = 0;

    try {
      await session.withTransaction(async () => {
        const updated = await Wallet.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId) },
          { $inc: { balance: -amount, reservedAmount: -amount } },
          { new: true, session }
        ).lean() as { balance: number };

        newBalance = updated?.balance ?? 0;

        const [created] = await WalletTransaction.create(
          [{
            userId:       new mongoose.Types.ObjectId(userId),
            type:         "withdrawal",
            amount,
            balanceAfter: newBalance,
            description,
            refId:        opts?.refId ?? null,
          }],
          { session }
        );
        txDoc = created as unknown as WalletTransactionDocument;
      });
    } finally {
      await session.endSession();
    }

    return { txDoc };
  }

  async sumPendingWithdrawals(userId: string): Promise<number> {
    await connectDB();
    const result = await WalletWithdrawal.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: { $in: ["pending", "processing"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  }
}

export const walletRepository = new WalletRepository();
