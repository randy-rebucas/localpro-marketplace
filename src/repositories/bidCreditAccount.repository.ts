import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import BidCreditAccount, { BidCreditAccountDocument, BidCreditTransaction, BidCreditTransactionDocument, BidCreditTxType } from "@/models/BidCreditAccount";

class BidCreditAccountRepository {
  /** Get or create the credit account for a provider. */
  async findOrCreate(providerId: string): Promise<BidCreditAccountDocument> {
    await connectDB();
    const existing = await BidCreditAccount.findOne({ providerId }).lean();
    if (existing) return existing as unknown as BidCreditAccountDocument;
    return BidCreditAccount.create({ providerId, balance: 0 }) as unknown as Promise<BidCreditAccountDocument>;
  }

  async getBalance(providerId: string): Promise<number> {
    await connectDB();
    const doc = await BidCreditAccount.findOne({ providerId }).select("balance").lean();
    return (doc as { balance?: number } | null)?.balance ?? 0;
  }

  /**
   * Atomically deduct `amount` credits from the provider's balance.
   * Uses findOneAndUpdate with $inc + a $gte filter to prevent going below zero.
   * Returns the new balance, or null if insufficient credits.
   */
  async debitCredit(
    providerId: string,
    amount: number,
    opts: { type?: BidCreditTxType; description?: string; quoteId?: string } = {}
  ): Promise<{ newBalance: number; txDoc: BidCreditTransactionDocument } | null> {
    await connectDB();
    const updated = await BidCreditAccount.findOneAndUpdate(
      { providerId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true }
    ).lean();

    if (!updated) return null; // insufficient credits

    const doc = updated as unknown as { balance: number };
    const txDoc = await BidCreditTransaction.create({
      providerId: new mongoose.Types.ObjectId(providerId),
      type: opts.type ?? "spend",
      delta: -amount,
      balanceAfter: doc.balance,
      description: opts.description ?? `Bid credit deducted`,
      quoteId: opts.quoteId ?? null,
    });

    return { newBalance: doc.balance, txDoc: txDoc as unknown as BidCreditTransactionDocument };
  }

  /**
   * Add credits to the provider's balance (purchase or admin grant).
   */
  async creditBalance(
    providerId: string,
    amount: number,
    opts: { type?: BidCreditTxType; description?: string; walletTxId?: string; paymongoSessionId?: string } = {}
  ): Promise<{ newBalance: number; txDoc: BidCreditTransactionDocument }> {
    await connectDB();
    const updated = await BidCreditAccount.findOneAndUpdate(
      { providerId },
      { $inc: { balance: amount } },
      { new: true, upsert: true }
    ).lean();

    const doc = updated as unknown as { balance: number };
    const txDoc = await BidCreditTransaction.create({
      providerId: new mongoose.Types.ObjectId(providerId),
      type: opts.type ?? "purchase",
      delta: amount,
      balanceAfter: doc.balance,
      description: opts.description ?? `Bid credit purchase — ${amount} token(s)`,
      walletTxId: opts.walletTxId ?? null,
      paymongoSessionId: opts.paymongoSessionId ?? null,
    });

    return { newBalance: doc.balance, txDoc: txDoc as unknown as BidCreditTransactionDocument };
  }

  async getHistory(providerId: string, limit = 20): Promise<BidCreditTransactionDocument[]> {
    await connectDB();
    return BidCreditTransaction.find({ providerId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as unknown as BidCreditTransactionDocument[];
  }

  async findCreditTransactionByPaymongoSession(sessionId: string): Promise<BidCreditTransactionDocument | null> {
    await connectDB();
    return BidCreditTransaction.findOne({ paymongoSessionId: sessionId }).lean() as unknown as BidCreditTransactionDocument | null;
  }
}

export const bidCreditAccountRepository = new BidCreditAccountRepository();
