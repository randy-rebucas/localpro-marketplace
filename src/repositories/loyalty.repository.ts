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

  /** Add earned points (both redeemable and lifetime), recalculate tier atomically. */
  async addPoints(userId: string, pts: number, lifetimePts: number): Promise<LoyaltyAccountDocument> {
    await this.connect();

    // Step 1: atomically increment points
    const account = await LoyaltyAccount.findOneAndUpdate(
      { userId },
      { $inc: { points: pts, lifetimePoints: lifetimePts } },
      { new: true, upsert: false }
    );
    if (!account) throw new Error("LoyaltyAccount not found");

    // Step 2: if tier needs to change, update it atomically using a
    // conditional write so concurrent calls can't both promote/demote.
    const newTier = tierFromPoints(account.lifetimePoints);
    if (account.tier !== newTier) {
      const promoted = await LoyaltyAccount.findOneAndUpdate(
        { userId, tier: account.tier },         // only update if tier hasn't changed yet
        { $set: { tier: newTier } },
        { new: true }
      );
      return promoted ?? account;
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

  /**
   * Atomically deducts points AND adds credits in a single write.
   * Prevents the partial-state window where points are gone but credits not yet added.
   * Returns null (without throwing) if balance is insufficient — caller should check.
   */
  async atomicRedeemPoints(
    userId: string,
    pts: number,
    credits: number
  ): Promise<LoyaltyAccountDocument | null> {
    await this.connect();
    return LoyaltyAccount.findOneAndUpdate(
      { userId, points: { $gte: pts } },
      { $inc: { points: -pts, credits } },
      { new: true }
    );
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

  /**
   * Atomically claims the first-job bonus for a user.
   * Uses a findOneAndUpdate with `lifetimePoints: 0` as a CAS condition so only
   * one concurrent call wins. Returns true if this call claimed it, false if
   * another caller already awarded points (lifetimePoints > 0).
   */
  async claimFirstJobBonus(userId: string): Promise<boolean> {
    await this.connect();
    const result = await LoyaltyAccount.findOneAndUpdate(
      { userId, lifetimePoints: 0 },
      { $set: { _firstJobBonusClaimed: true } }, // sentinel field (just needs to match)
      { new: false }
    );
    return result !== null;
  }

  /**
   * Atomically marks the referral bonus as awarded.
   * Returns true if this call claimed it (was false before), false if already awarded.
   */
  async atomicClaimReferralBonus(userId: string): Promise<boolean> {
    await this.connect();
    const result = await LoyaltyAccount.findOneAndUpdate(
      { userId, referralBonusAwarded: false },
      { $set: { referralBonusAwarded: true } },
      { new: false }
    );
    return result !== null;
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

  /** Returns true if a ledger entry of the given type for the given jobId already exists. */
  async hasLedgerEntry(userId: string, type: LoyaltyTransactionType, jobId: string): Promise<boolean> {
    await this.connect();
    const exists = await LoyaltyTransaction.exists({ userId, type, jobId });
    return !!exists;
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
