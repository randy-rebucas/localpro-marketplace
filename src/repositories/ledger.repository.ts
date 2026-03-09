import mongoose from "mongoose";
import LedgerEntry from "@/models/LedgerEntry";
import type { LedgerEntryDocument, ILedgerEntry, AccountCode } from "@/models/LedgerEntry";
import AccountBalance from "@/models/AccountBalance";
import type { AccountBalanceDocument } from "@/models/AccountBalance";
import { ACCOUNT_NAMES, ACCOUNT_TYPES } from "@/models/LedgerEntry";
import { connectDB } from "@/lib/db";

export type JournalEntryInput = Omit<ILedgerEntry, "_id" | "createdAt">;

export class LedgerRepository {
  /**
   * Posts multiple journal entries atomically within a single bulk write.
   * All entries share the same journalId.
   */
  async postJournal(entries: JournalEntryInput[]): Promise<LedgerEntryDocument[]> {
    await connectDB();
    const docs = await LedgerEntry.insertMany(entries, { ordered: true });
    return docs as unknown as LedgerEntryDocument[];
  }

  /** Return all entries for a given journal (transaction group) */
  async findByJournalId(journalId: string): Promise<LedgerEntryDocument[]> {
    await connectDB();
    return LedgerEntry.find({ journalId }).sort({ createdAt: 1 }).lean() as unknown as LedgerEntryDocument[];
  }

  /** Return all entries for an entity (e.g., a specific job) */
  async findByEntity(
    entityType: ILedgerEntry["entityType"],
    entityId: string
  ): Promise<LedgerEntryDocument[]> {
    await connectDB();
    return LedgerEntry.find({
      entityType,
      entityId: new mongoose.Types.ObjectId(entityId),
    })
      .sort({ createdAt: 1 })
      .lean() as unknown as LedgerEntryDocument[];
  }

  /** Return entries for a given user (client or provider) */
  async findByUser(
    userId: string,
    role: "client" | "provider",
    limit = 100
  ): Promise<LedgerEntryDocument[]> {
    await connectDB();
    const field = role === "client" ? "clientId" : "providerId";
    return LedgerEntry.find({ [field]: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as unknown as LedgerEntryDocument[];
  }

  /**
   * Compute the live balance for an account by summing all ledger entries.
   * Debit increases assets/expenses; credit increases liabilities/revenue/equity.
   */
  async computeAccountBalance(
    accountCode: AccountCode,
    currency = "PHP"
  ): Promise<number> {
    await connectDB();

    const [debits, credits] = await Promise.all([
      LedgerEntry.aggregate([
        { $match: { debitAccount: accountCode, currency } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ]),
      LedgerEntry.aggregate([
        { $match: { creditAccount: accountCode, currency } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ]),
    ]);

    const totalDebits  = (debits[0]?.total  ?? 0) as number;
    const totalCredits = (credits[0]?.total ?? 0) as number;

    const type = ACCOUNT_TYPES[accountCode];
    // Normal balance: assets/expenses = debit; liabilities/equity/revenue = credit
    if (type === "asset" || type === "expense") {
      return totalDebits - totalCredits;
    }
    return totalCredits - totalDebits;
  }

  /**
   * Recompute and cache all account balances.
   * Called by the daily reconciliation cron.
   */
  async refreshAccountBalances(currency = "PHP"): Promise<void> {
    await connectDB();
    const codes = Object.keys(ACCOUNT_NAMES) as AccountCode[];
    const now = new Date();

    await Promise.all(
      codes.map(async (code) => {
        const balance = await this.computeAccountBalance(code, currency);
        await AccountBalance.findOneAndUpdate(
          { accountCode: code, currency },
          { balance, asOf: now },
          { upsert: true }
        );
      })
    );
  }

  /** Get cached balance (fast — from AccountBalance collection) */
  async getCachedBalance(
    accountCode: AccountCode,
    currency = "PHP"
  ): Promise<number> {
    await connectDB();
    const doc = await AccountBalance.findOne({ accountCode, currency }).lean();
    return (doc as AccountBalanceDocument | null)?.balance ?? 0;
  }

  /** Full trial balance — all accounts and their current cached balances */
  async getTrialBalance(currency = "PHP"): Promise<
    { accountCode: AccountCode; name: string; type: string; balance: number; balancePHP: number }[]
  > {
    await connectDB();
    const codes = Object.keys(ACCOUNT_NAMES) as AccountCode[];

    const rows = await Promise.all(
      codes.map(async (code) => {
        const balance = await this.computeAccountBalance(code, currency);
        return {
          accountCode: code,
          name: ACCOUNT_NAMES[code],
          type: ACCOUNT_TYPES[code],
          balance,
          balancePHP: balance / 100,
        };
      })
    );

    return rows;
  }

  /**
   * Income statement for a date range.
   * Returns revenue, expenses, and net income in centavos.
   */
  async getIncomeStatement(
    from: Date,
    to: Date,
    currency = "PHP"
  ): Promise<{ revenue: number; expenses: number; netIncome: number; breakdown: Record<AccountCode, number> }> {
    await connectDB();

    const revenueCodes: AccountCode[] = ["4000", "4100", "4200"];
    const expenseCodes: AccountCode[] = ["5000", "5100", "5200"];

    const breakdown: Record<string, number> = {};
    let revenue = 0;
    let expenses = 0;

    for (const code of revenueCodes) {
      const [cr] = await LedgerEntry.aggregate([
        { $match: { creditAccount: code, currency, createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ]);
      const [dr] = await LedgerEntry.aggregate([
        { $match: { debitAccount: code, currency, createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ]);
      const net = ((cr?.total ?? 0) as number) - ((dr?.total ?? 0) as number);
      breakdown[code] = net;
      revenue += net;
    }

    for (const code of expenseCodes) {
      const [dr] = await LedgerEntry.aggregate([
        { $match: { debitAccount: code, currency, createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ]);
      const [cr] = await LedgerEntry.aggregate([
        { $match: { creditAccount: code, currency, createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ]);
      const net = ((dr?.total ?? 0) as number) - ((cr?.total ?? 0) as number);
      breakdown[code] = net;
      expenses += net;
    }

    return { revenue, expenses, netIncome: revenue - expenses, breakdown: breakdown as Record<AccountCode, number> };
  }

  /** Count journal entries for a given entity — useful for auditing */
  async countByEntity(entityType: ILedgerEntry["entityType"], entityId: string): Promise<number> {
    await connectDB();
    return LedgerEntry.countDocuments({
      entityType,
      entityId: new mongoose.Types.ObjectId(entityId),
    });
  }
}

export const ledgerRepository = new LedgerRepository();
