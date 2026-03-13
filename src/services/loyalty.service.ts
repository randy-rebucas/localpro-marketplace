import { loyaltyRepository } from "@/repositories/loyalty.repository";
import { TIER_MULTIPLIER } from "@/lib/loyalty";
import { getAppSetting } from "@/lib/appSettings";
import { UnprocessableError, NotFoundError } from "@/lib/errors";
import type { LoyaltyAccountDocument } from "@/models/LoyaltyAccount";

export class LoyaltyService {
  /** Get or create the loyalty account for a user. */
  async getAccount(userId: string): Promise<LoyaltyAccountDocument> {
    return loyaltyRepository.findOrCreate(userId);
  }

  /**
   * Award points for a completed job (escrow released).
   * - 1 pt per ₱10 spent
   * - +100 bonus if it's the client's very first job
   * - Tier multiplier applied (Gold ×1.05, Platinum ×1.10)
   * - Triggers referral bonus if this is the referee's first job
   */
  async awardJobPoints(
    userId: string,
    jobAmount: number,
    jobId: string,
    isFirstJob: boolean
  ): Promise<void> {
    const account = await loyaltyRepository.findOrCreate(userId);
    const multiplier = TIER_MULTIPLIER[account.tier];

    const pointsPerPeso = await getAppSetting<number>("loyalty.pointsPerPeso", 0.1);
    const basePoints = Math.floor(jobAmount * (pointsPerPeso as number));
    const multipliedPoints = Math.round(basePoints * multiplier);

    if (multipliedPoints > 0) {
      await loyaltyRepository.addPoints(userId, multipliedPoints, multipliedPoints);
      await loyaltyRepository.addLedgerEntry({
        userId,
        type: "earned_job",
        points: multipliedPoints,
        jobId,
        description: `Earned ${multipliedPoints} pts for completed job`,
      });
    }

    if (isFirstJob) {
      const bonusPoints = await getAppSetting<number>("loyalty.firstJobBonusPoints", 100) as number;
      await loyaltyRepository.addPoints(userId, bonusPoints, bonusPoints);
      await loyaltyRepository.addLedgerEntry({
        userId,
        type: "earned_first_job",
        points: bonusPoints,
        jobId,
        description: `First job bonus: +${bonusPoints} pts`,
      });
    }

    // Check and trigger referral bonus
    const fresh = await loyaltyRepository.findByUserId(userId);
    if (
      fresh &&
      fresh.referredBy &&
      !fresh.referralBonusAwarded &&
      (isFirstJob || (fresh.lifetimePoints <= multipliedPoints + (isFirstJob ? 100 : 0)))
    ) {
      await this.awardReferralBonus(fresh.referredBy.toString(), userId);
    }
  }

  /** Award referral bonuses: +200 pts to referrer, +100 pts to referee. */
  async awardReferralBonus(referrerId: string, refereeId: string): Promise<void> {
    await loyaltyRepository.markReferralBonusAwarded(refereeId);

    // Referrer bonus
    await loyaltyRepository.findOrCreate(referrerId);
    await loyaltyRepository.addPoints(referrerId, 200, 200);
    await loyaltyRepository.addLedgerEntry({
      userId: referrerId,
      type: "earned_referral",
      points: 200,
      description: "Referral bonus: +200 pts (your referral completed their first job)",
    });

    // Referee bonus
    await loyaltyRepository.addPoints(refereeId, 100, 100);
    await loyaltyRepository.addLedgerEntry({
      userId: refereeId,
      type: "earned_referral",
      points: 100,
      description: "Welcome bonus: +100 pts (referred by a friend)",
    });
  }

  /** Award +50 pts for submitting a review. */
  async awardReviewPoints(userId: string, jobId: string): Promise<void> {
    await loyaltyRepository.findOrCreate(userId);
    await loyaltyRepository.addPoints(userId, 50, 50);
    await loyaltyRepository.addLedgerEntry({
      userId,
      type: "earned_review",
      points: 50,
      jobId,
      description: "Review bonus: +50 pts",
    });
  }

  /**
   * Redeem points for ₱ cashback credits.
   * Minimum 500 pts per redemption = ₱50.
   */
  async redeemPoints(userId: string, pointsToRedeem: number): Promise<LoyaltyAccountDocument> {
    const minRedemption = await getAppSetting<number>("loyalty.minRedemptionPoints", 500) as number;
    if (pointsToRedeem < minRedemption) {
      const creditValue = Math.floor(minRedemption / 100) * (await getAppSetting<number>("loyalty.pesoPerHundredPoints", 10) as number);
      throw new UnprocessableError(`Minimum redemption is ${minRedemption} points (₱${creditValue})`);
    }
    if (pointsToRedeem % 100 !== 0) {
      throw new UnprocessableError("Points must be redeemed in multiples of 100");
    }

    const account = await loyaltyRepository.findByUserId(userId);
    if (!account) throw new NotFoundError("Loyalty account");
    if (account.points < pointsToRedeem) {
      throw new UnprocessableError("Insufficient points");
    }

    const pesoPerHundred = await getAppSetting<number>("loyalty.pesoPerHundredPoints", 10) as number;
    const creditAmount = Math.floor(pointsToRedeem / 100) * pesoPerHundred;

    const updated = await loyaltyRepository.deductPoints(userId, pointsToRedeem);
    await loyaltyRepository.addCredits(userId, creditAmount);
    await loyaltyRepository.addLedgerEntry({
      userId,
      type: "redeemed",
      points: -pointsToRedeem,
      credits: creditAmount,
      description: `Redeemed ${pointsToRedeem} pts for ₱${creditAmount} cashback credit`,
    });

    return updated;
  }

  /**
   * Apply available credits toward a payment.
   * Returns the ₱ discount amount actually applied (≤ maxAmount).
   */
  async applyCredits(userId: string, maxAmount: number): Promise<number> {
    const account = await loyaltyRepository.findByUserId(userId);
    if (!account || account.credits <= 0) return 0;

    const discount = Math.min(account.credits, maxAmount);
    await loyaltyRepository.deductCredits(userId, discount);
    await loyaltyRepository.addLedgerEntry({
      userId,
      type: "credit_applied",
      points: 0,
      credits: -discount,
      description: `Applied ₱${discount.toFixed(2)} cashback credit to payment`,
    });

    return discount;
  }
}

export const loyaltyService = new LoyaltyService();
