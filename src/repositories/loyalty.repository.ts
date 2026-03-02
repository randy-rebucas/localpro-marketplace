import LoyaltyAccount, { type LoyaltyAccountDocument } from "@/models/LoyaltyAccount";
import LoyaltyTransaction, { type LoyaltyTransactionDocument } from "@/models/LoyaltyTransaction";
import { connectDB } from "@/lib/db";
import { generateReferralCode, tierFromPoints } from "@/lib/loyalty";
import type { LoyaltyTransactionType } from "@/types";

export class LoyaltyRepository {
  private async connect() {
    await connectDB();
  }

  /** Get account or create one (with referral code) if it doesn't exist. */
  async findOrCreate(userId: string): Promise<LoyaltyAccountDocument> {
    await this.connect();
    let account = await LoyaltyAccount.findOne({ userId });
    if (!account) {
      let code = generateReferralCode();
      // Ensure uniqueness
      while (await LoyaltyAccount.exists({ referralCode: code })) {
        code = generateReferralCode();
      }
      account = await LoyaltyAccount.create({ userId, referralCode: code });
    }
    return account;
  }

  async findByUserId(userId: string): Promise<LoyaltyAccountDocument | null> {
    await this.connect();
    return LoyaltyAccount.findOne({ userId });
  }

  async findByReferralCode(code: string): Promise<LoyaltyAccountDocument | null> {
    await this.connect();
    return LoyaltyAccount.findOne({ referralCode: code.toUpperCase().trim() });
  }

  /** Add earned points (both redeemable and lifetime), recalculate tier. */
  async addPoints(userId: string, pts: number, lifetimePts: number): Promise<LoyaltyAccountDocument> {
    await this.connect();
    const account = await LoyaltyAccount.findOneAndUpdate(
      { userId },
      {
        $inc: { points: pts, lifetimePoints: lifetimePts },
      },
      { new: true, upsert: false }
    );
    if (!account) throw new Error("LoyaltyAccount not found");

    // Recalculate tier after increment
    const newTier = tierFromPoints(account.lifetimePoints);
    if (account.tier !== newTier) {
      account.tier = newTier;
      await account.save();
    }
    return account;
  }

  async deductPoints(userId: string, pts: number): Promise<LoyaltyAccountDocument> {
    await this.connect();
    const account = await LoyaltyAccount.findOneAndUpdate(
      { userId, points: { $gte: pts } },
      { $inc: { points: -pts } },
      { new: true }
    );
    if (!account) throw new Error("Insufficient points");
    return account;
  }

  async addCredits(userId: string, amount: number): Promise<void> {
    await this.connect();
    await LoyaltyAccount.findOneAndUpdate({ userId }, { $inc: { credits: amount } });
  }

  async deductCredits(userId: string, amount: number): Promise<LoyaltyAccountDocument> {
    await this.connect();
    const account = await LoyaltyAccount.findOneAndUpdate(
      { userId, credits: { $gte: amount } },
      { $inc: { credits: -amount } },
      { new: true }
    );
    if (!account) throw new Error("Insufficient credits");
    return account;
  }

  async markReferralBonusAwarded(userId: string): Promise<void> {
    await this.connect();
    await LoyaltyAccount.findOneAndUpdate({ userId }, { referralBonusAwarded: true });
  }

  async setReferredBy(userId: string, referrerId: string): Promise<void> {
    await this.connect();
    await LoyaltyAccount.findOneAndUpdate({ userId }, { referredBy: referrerId });
  }

  async addLedgerEntry(data: {
    userId: string;
    type: LoyaltyTransactionType;
    points: number;
    credits?: number;
    jobId?: string | null;
    description: string;
  }): Promise<LoyaltyTransactionDocument> {
    await this.connect();
    return LoyaltyTransaction.create({
      userId: data.userId,
      type: data.type,
      points: data.points,
      credits: data.credits ?? 0,
      jobId: data.jobId ?? null,
      description: data.description,
    });
  }

  async getLedger(userId: string, limit = 20): Promise<LoyaltyTransactionDocument[]> {
    await this.connect();
    return LoyaltyTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as unknown as LoyaltyTransactionDocument[];
  }

  async countReferrals(referrerId: string): Promise<number> {
    await this.connect();
    return LoyaltyAccount.countDocuments({ referredBy: referrerId });
  }

  async getAdminStats(): Promise<{
    totalPointsIssued: number;
    totalCreditsIssued: number;
    totalRedemptions: number;
    totalAccounts: number;
  }> {
    await this.connect();
    const [pointsAgg, creditsAgg, redemptions, totalAccounts] = await Promise.all([
      LoyaltyTransaction.aggregate([
        { $match: { points: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$points" } } },
      ]),
      LoyaltyTransaction.aggregate([
        { $match: { type: "redeemed" } },
        { $group: { _id: null, total: { $sum: "$credits" } } },
      ]),
      LoyaltyTransaction.countDocuments({ type: "redeemed" }),
      LoyaltyAccount.countDocuments(),
    ]);
    return {
      totalPointsIssued: pointsAgg[0]?.total ?? 0,
      totalCreditsIssued: creditsAgg[0]?.total ?? 0,
      totalRedemptions: redemptions,
      totalAccounts,
    };
  }
}

export const loyaltyRepository = new LoyaltyRepository();
