import { loyaltyRepository } from "@/repositories/loyalty.repository";
import { TIER_MULTIPLIER } from "@/lib/loyalty";
import { getAppSetting } from "@/lib/appSettings";
import { UnprocessableError, NotFoundError } from "@/lib/errors";
import type { LoyaltyAccountDocument } from "@/models/LoyaltyAccount";
import { sendReferralBonusAwardedEmail } from "@/lib/email";
import User from "@/models/User";

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
   *
   * L19: Idempotent — safe to call multiple times for the same jobId
   * (e.g., if the auto-release cron retries). Points are awarded at most once
   * per (userId, earned_job, jobId) combination.
   */
  async awardJobPoints(
    userId: string,
    jobAmount: number,
    jobId: string,
    _isFirstJobHint?: boolean   // deprecated param kept for backwards compat; ignored
  ): Promise<void> {
    // L19: Check idempotency — skip if points already awarded for this job
    const alreadyAwarded = await loyaltyRepository.hasLedgerEntry(userId, "earned_job", jobId);
    if (alreadyAwarded) return;

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

    // ── First-job bonus: atomic CAS so only one concurrent call wins (C8) ──
    const isFirstJob = await loyaltyRepository.claimFirstJobBonus(userId);
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
    if (fresh && fresh.referredBy && !fresh.referralBonusAwarded) {
      await this.awardReferralBonus(fresh.referredBy.toString(), userId);
    }
  }

  /** Award referral bonuses: +200 pts to referrer, +100 pts to referee. */
  async awardReferralBonus(referrerId: string, refereeId: string): Promise<void> {
    // Atomic CAS: only proceed if referralBonusAwarded is still false (C9)
    const claimed = await loyaltyRepository.atomicClaimReferralBonus(refereeId);
    if (!claimed) {
      // Already awarded by a concurrent call — skip to prevent double-award
      return;
    }

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

    // Notify referrer via email (non-blocking)
    void (async () => {
      try {
        const referrer = await User.findById(referrerId).select("name email").lean();
        const referee = await User.findById(refereeId).select("name").lean();
        if (referrer?.email) {
          await sendReferralBonusAwardedEmail(
            referrer.email,
            referrer.name ?? "there",
            referee?.name ?? "Your referral",
            200
          );
        }
      } catch (err) {
        console.error("[LOYALTY] Referral bonus email error:", err);
      }
    })();
  }

  /** Award +50 pts for submitting a review. Idempotent — one award per job. */
  async awardReviewPoints(userId: string, jobId: string): Promise<void> {
    await loyaltyRepository.findOrCreate(userId);

    // Idempotency: skip if the review bonus for this job was already awarded
    const alreadyAwarded = await loyaltyRepository.hasLedgerEntry(userId, "earned_review", jobId);
    if (alreadyAwarded) return;

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
