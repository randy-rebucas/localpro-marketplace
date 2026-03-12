import mongoose from "mongoose";
import type { PipelineStage } from "mongoose";
import LedgerEntry from "@/models/LedgerEntry";
import type { LedgerEntryDocument, ILedgerEntry, AccountCode } from "@/models/LedgerEntry";
import AccountBalance from "@/models/AccountBalance";
import type { AccountBalanceDocument } from "@/models/AccountBalance";
import { ACCOUNT_NAMES, ACCOUNT_TYPES } from "@/models/LedgerEntry";
import { connectDB } from "@/lib/db";

export type JournalEntryInput = Omit<ILedgerEntry, "_id" | "createdAt">;

export class LedgerRepository {
  /**
   * Posts multiple journal entries atomically inside a MongoDB session.
   * If any insertion fails the whole journal is rolled back, keeping the
   * ledger balanced at all times.
   */
  async postJournal(entries: JournalEntryInput[]): Promise<LedgerEntryDocument[]> {
    await connectDB();
    const session = await mongoose.startSession();
    let docs: LedgerEntryDocument[];
    try {
      await session.withTransaction(async () => {
        const result = await LedgerEntry.insertMany(entries, { session, ordered: true });
        docs = result as unknown as LedgerEntryDocument[];
      });
    } finally {
      await session.endSession();
    }
    return docs!;
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
   * Uses a single $facet pipeline (2 passes) instead of 12 serial aggregates.
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
    const allCodes = [...revenueCodes, ...expenseCodes];
    const dateFilter = { currency, createdAt: { $gte: from, $lte: to } };

    // Single pipeline: group credits and debits by account code in one pass each
    const facet: PipelineStage.Facet["$facet"] = {};
    for (const code of allCodes) {
      facet[`cr_${code}`] = [
        { $match: { ...dateFilter, creditAccount: code } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ];
      facet[`dr_${code}`] = [
        { $match: { ...dateFilter, debitAccount: code } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ];
    }

    const [result] = await LedgerEntry.aggregate([{ $facet: facet }]);

    const breakdown: Record<string, number> = {};
    let revenue = 0;
    let expenses = 0;

    for (const code of revenueCodes) {
      const cr = (result[`cr_${code}`][0]?.total ?? 0) as number;
      const dr = (result[`dr_${code}`][0]?.total ?? 0) as number;
      const net = cr - dr;
      breakdown[code] = net;
      revenue += net;
    }
    for (const code of expenseCodes) {
      const dr = (result[`dr_${code}`][0]?.total ?? 0) as number;
      const cr = (result[`cr_${code}`][0]?.total ?? 0) as number;
      const net = dr - cr;
      breakdown[code] = net;
      expenses += net;
    }

    return { revenue, expenses, netIncome: revenue - expenses, breakdown: breakdown as Record<AccountCode, number> };
  }

  /**
   * All-time revenue totals sourced from the ledger.
   * - GMV  = sum of credits to 2000 (Escrow Payable — Clients), i.e. total escrow funded
   * - commission = balance of account 4000 (Commission Revenue)
   * - refunds    = balance of account 5000 (Refunds Issued)
   */
  async getRevenueTotals(currency = "PHP"): Promise<{
    gmvCentavos: number;
    commissionCentavos: number;
    refundsCentavos: number;
  }> {
    await connectDB();
    const [gmvRes, commCr, commDr, refDr, refCr] = await Promise.all([
      LedgerEntry.aggregate([
        { $match: { creditAccount: "2000", currency } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ]),
      LedgerEntry.aggregate([
        { $match: { creditAccount: "4000", currency } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ]),
      LedgerEntry.aggregate([
        { $match: { debitAccount: "4000", currency } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ]),
      LedgerEntry.aggregate([
        { $match: { debitAccount: "5000", currency } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ]),
      LedgerEntry.aggregate([
        { $match: { creditAccount: "5000", currency } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ]),
    ]);
    return {
      gmvCentavos:        (gmvRes[0]?.total  ?? 0) as number,
      commissionCentavos: ((commCr[0]?.total ?? 0) as number) - ((commDr[0]?.total ?? 0) as number),
      refundsCentavos:    ((refDr[0]?.total  ?? 0) as number) - ((refCr[0]?.total  ?? 0) as number),
    };
  }

  /**
   * Month-by-month revenue breakdown sourced from the ledger.
   * Each row: { year, month, gmvCentavos, commissionCentavos }
   * - GMV        = credits to 2000 in that month
   * - Commission = credits to 4000 in that month
   */
  async getMonthlyLedgerRevenue(
    from: Date,
    currency = "PHP"
  ): Promise<{ _id: { year: number; month: number }; gmv: number; commission: number }[]> {
    await connectDB();

    const [gmvRows, commRows] = await Promise.all([
      LedgerEntry.aggregate([
        { $match: { creditAccount: "2000", currency, createdAt: { $gte: from } } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            total: { $sum: "$amountCentavos" },
          },
        },
      ]),
      LedgerEntry.aggregate([
        { $match: { creditAccount: "4000", currency, createdAt: { $gte: from } } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            total: { $sum: "$amountCentavos" },
          },
        },
      ]),
    ]);

    // Merge into a single list keyed by year+month
    const map = new Map<string, { _id: { year: number; month: number }; gmv: number; commission: number }>();
    for (const r of gmvRows) {
      const key = `${r._id.year}-${r._id.month}`;
      map.set(key, { _id: r._id, gmv: r.total as number, commission: 0 });
    }
    for (const r of commRows) {
      const key = `${r._id.year}-${r._id.month}`;
      const existing = map.get(key);
      if (existing) {
        existing.commission = r.total as number;
      } else {
        map.set(key, { _id: r._id, gmv: 0, commission: r.total as number });
      }
    }
    return Array.from(map.values());
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
