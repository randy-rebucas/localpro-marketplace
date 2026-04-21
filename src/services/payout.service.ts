import { payoutRepository } from "@/repositories/payout.repository";
import { transactionRepository, activityRepository, userRepository } from "@/repositories";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import { ledgerService } from "@/services/ledger.service";
import { AIDecisionService } from "@/services/ai-decision.service";
import { getAppSetting } from "@/lib/appSettings";
import { calculateWithdrawalFee } from "@/lib/commission";
import { connectDB } from "@/lib/db";
import {
  NotFoundError,
  ForbiddenError,
  UnprocessableError,
} from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import type { PayoutStatus } from "@/types";

export class PayoutService {
  /** Returns available payout balance for a provider. */
  async getAvailableBalance(providerId: string): Promise<number> {
    // Total net from all completed transactions (uses existing repository aggregate)
    const { net: totalNet } = await transactionRepository.sumCompletedByPayee(providerId);

    // Already requested/paid out
    const paidOut = await payoutRepository.sumPaidOut(providerId);

    return Math.max(0, totalNet - paidOut);
  }

  /** Provider requests a payout. */
  async requestPayout(
    user: TokenPayload,
    data: {
      amount: number;
      bankName: string;
      accountNumber: string;
      accountName: string;
    }
  ) {
    if (user.role !== "provider") throw new ForbiddenError();

    const { amount, bankName, accountNumber, accountName } = data;

    if (!amount || amount <= 0) {
      throw new UnprocessableError("Amount must be greater than zero.");
    }
    const minPayout = await getAppSetting("payments.minPayoutAmount", 100) as number;
    if (amount < minPayout) {
      throw new UnprocessableError(`Minimum payout amount is ₱${minPayout.toLocaleString()}.`);
    }
    if (!bankName?.trim() || !accountNumber?.trim() || !accountName?.trim()) {
      throw new UnprocessableError("Bank name, account number, and account name are required.");
    }

    const available = await this.getAvailableBalance(user.userId);
    if (amount > available) {
      throw new UnprocessableError(
        `Requested amount exceeds your available balance of ₱${available.toFixed(2)}.`
      );
    }

    const payout = await payoutRepository.create({
      providerId: user.userId,
      amount,
      status: "pending",
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
    });

    // ── Race-condition guard: re-verify balance AFTER creating the payout ──
    // Both this payout and any concurrent payout are now visible in sumPaidOut,
    // so a negative balance means a concurrent request already consumed the funds.
    const recheckBalance = await this.getAvailableBalance(user.userId);
    if (recheckBalance < 0) {
      // Cancel the just-created payout to restore balance visibility
      await payoutRepository.updateById(payout._id?.toString() ?? "", { status: "rejected", notes: "Cancelled — concurrent payout exceeded available balance" });
      throw new UnprocessableError(
        "Insufficient balance — a concurrent payout request consumed your available funds. Please try again."
      );
    }

    // Post ledger entry: ring-fence provider's earnings as in-flight (DR 2100 / CR 2400)
    // Fetch withdrawal fee settings and compute fee
    const [feeBank, feeGcash] = await Promise.all([
      getAppSetting("payments.withdrawalFeeBank", 20) as Promise<number>,
      getAppSetting("payments.withdrawalFeeGcash", 15) as Promise<number>,
    ]);
    const { withdrawalFee, netAmount } = calculateWithdrawalFee(
      amount, bankName.trim(), feeBank as number, feeGcash as number
    );

    // Persist the withdrawal fee on the payout document
    await payoutRepository.updateById(
      payout._id?.toString() ?? "",
      { withdrawalFee }
    );

    // ── Auto-approval check for qualified providers ───────────────────────────
    // Providers with 10+ completed jobs, 4.0+ average rating, and at least one
    // prior completed payout skip admin review and go straight to "processing".
    let autoApproved = false;
    try {
      // ── Fraud Detection (non-blocking) ──────────────────────────────────────
      // Check transaction for fraud indicators before auto-approval
      await connectDB();
      const userData = await userRepository.getDocById(user.userId);
      let fraudRisk = "low";

      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const fraudResponse = await fetch(`${appUrl}/api/ai/agents/fraud-detector`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
          },
          body: JSON.stringify({
            transactionId: payout._id?.toString(),
            type: "withdrawal",
            amount,
            userHistory: {
              accountAge: userData && userData.createdAt
                ? Math.floor(
                    (Date.now() - new Date(userData.createdAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : 0,
              chargebacks: (userData as any)?.chargebackCount || 0,
              disputes: (userData as any)?.disputeCount || 0,
              fraudFlags: (userData as any)?.fraudFlags || [],
              previousWithdrawals: (userData as any)?.totalWithdrawn || 0,
              averageWithdrawal: (userData as any)?.averageWithdrawl || 0,
              jobsCompleted: (userData as any)?.jobsCompleted || 0,
              accountRating: (userData as any)?.rating || 0,
            },
          }),
        });

        if (fraudResponse.ok) {
          const fraudResult = await fraudResponse.json();
          fraudRisk = fraudResult.decision?.riskLevel || "low";

          // If HIGH fraud risk: queue for manual review
          if (fraudRisk === "high") {
            await AIDecisionService.createDecision({
              type: "PAYOUT",
              agentName: "support_agent",
              confidenceScore: fraudResult.decision?.confidence || 0,
              riskLevel: "high",
              recommendation: `High fraud risk detected for payout: ${fraudResult.decision?.fraudIndicators?.join(", ") || "Suspicious activity"}`,
              supportingEvidence: {
                fraudScore: fraudResult.decision?.riskScore,
                behavioralFlags: fraudResult.decision?.fraudIndicators,
              },
              relatedEntityType: "payout",
              relatedEntityId: payout._id as any,
            });
          } else if (fraudRisk === "medium") {
            // Flag for founder review but don't block
            await AIDecisionService.createDecision({
              type: "PAYOUT",
              agentName: "support_agent",
              confidenceScore: fraudResult.decision?.confidence || 0,
              riskLevel: "medium",
              recommendation: `Medium fraud risk on payout - manual review recommended`,
              supportingEvidence: {
                fraudScore: fraudResult.decision?.riskScore,
                behavioralFlags: fraudResult.decision?.fraudIndicators,
              },
              relatedEntityType: "payout",
              relatedEntityId: payout._id as any,
            });
          }
        }
      } catch (err) {
        console.error("[PayoutService] Fraud detection failed (non-blocking):", err);
        // Continue - fraud check is advisory only
      }

      // ── Standard auto-approval check ────────────────────────────────────────
      // Only auto-approve if fraud risk is low
      if (fraudRisk === "low") {
        const [profile, completedPayoutCount] = await Promise.all([
          providerProfileRepository.findByUserId(user.userId),
          payoutRepository.countCompletedByProvider(user.userId),
        ]);

        if (
          profile &&
          (profile as unknown as { completedJobCount: number }).completedJobCount >= 10 &&
          (profile as unknown as { avgRating: number }).avgRating >= 4.0 &&
          completedPayoutCount >= 1
        ) {
          autoApproved = true;
          await payoutRepository.updateById(
            payout._id?.toString() ?? "",
            { status: "processing", autoApproved: true, processedAt: new Date() }
          );
          console.log(
            `[PayoutService] Auto-approved payout ${payout._id?.toString()} for provider ${user.userId} ` +
            `(completedJobs=${(profile as unknown as { completedJobCount: number }).completedJobCount}, ` +
            `avgRating=${(profile as unknown as { avgRating: number }).avgRating}, ` +
            `priorPayouts=${completedPayoutCount})`
          );
        }
      }
    } catch (err) {
      // Non-critical — if auto-approval check fails, payout stays in "pending" for admin review
      console.error("[PayoutService] Auto-approval check failed:", err);
    }

    // Post ledger entries (non-critical)
    try {
      await ledgerService.postPayoutRequested(
        {
          journalId: `payout-requested-${payout._id?.toString()}`,
          entityType: "payout",
          entityId: payout._id?.toString() ?? "",
          providerId: user.userId,
          initiatedBy: user.userId,
        },
        amount
      );
      // Immediately split off the fee as revenue (DR 2400 / CR 4500)
      if (withdrawalFee > 0) {
        await ledgerService.postWithdrawalFeeAccrued(
          {
            journalId: `withdrawal-fee-${payout._id?.toString()}`,
            entityType: "payout",
            entityId: payout._id?.toString() ?? "",
            providerId: user.userId,
            initiatedBy: user.userId,
          },
          withdrawalFee
        );
      }
      await payoutRepository.updateById(
        payout._id?.toString() ?? "",
        { ledgerJournalId: `payout-requested-${payout._id?.toString()}` }
      );
    } catch { /* non-critical */ }

    await activityRepository.log({
      userId: user.userId,
      eventType: "payout_requested",
      metadata: { payoutId: payout._id?.toString(), amount, withdrawalFee, autoApproved },
    });

    const { notificationService } = await import("@/services/notification.service");
    const statusNote = autoApproved
      ? " Your payout has been auto-approved and is now processing."
      : "";
    await notificationService.push({
      userId: user.userId,
      type: "payout_requested",
      title: autoApproved ? "Payout auto-approved" : "Payout request submitted",
      message: `Your payout of ₱${amount.toLocaleString()} has been submitted. A withdrawal fee of ₱${withdrawalFee} applies — you will receive ₱${netAmount.toLocaleString()}.${statusNote}`,
      data: { payoutId: payout._id?.toString() },
    });

    return payout;
  }

  /** List payouts for the authenticated provider, with accounting stats. */
  async listProviderPayouts(user: TokenPayload) {
    if (user.role !== "provider") throw new ForbiddenError();
    const [payouts, available, netEarned, pendingEscrow, payoutStats] = await Promise.all([
      payoutRepository.findByProvider(user.userId),
      this.getAvailableBalance(user.userId),
      transactionRepository.sumCompletedByPayee(user.userId),
      transactionRepository.sumPendingByPayee(user.userId),
      payoutRepository.getProviderStats(user.userId),
    ]);
    return {
      payouts,
      availableBalance: available,
      totalNetEarned:   netEarned.net,
      pendingInEscrow:  pendingEscrow,
      payoutStats,
    };
  }

  /** Admin: list all payout requests (paginated). */
  async listAllPayouts(page = 1, limit = 20) {
    return payoutRepository.findAllWithProvider(page, limit);
  }

  /** Admin: approve, mark processing, complete, or reject a payout. */
  async updatePayoutStatus(
    admin: TokenPayload,
    payoutId: string,
    data: { status: PayoutStatus; notes?: string }
  ) {
    if (admin.role !== "admin") throw new ForbiddenError();

    const payout = await payoutRepository.findById(payoutId);
    if (!payout) throw new NotFoundError("Payout");

    const update: Record<string, unknown> = { status: data.status };
    if (data.notes !== undefined) update.notes = data.notes;
    if (data.status === "completed" || data.status === "processing") {
      update.processedAt = new Date();
    }

    const updated = await payoutRepository.updateById(payoutId, update);

    // Post ledger entry when payout is completed (DR Earnings Payable / CR Gateway Receivable)
    const p = payout as unknown as { providerId: { toString(): string }; amount: number; withdrawalFee?: number };
    const netPayout = p.amount - (p.withdrawalFee ?? 0);
    if (data.status === "completed") {
      try {
        await ledgerService.postPayoutSent(
          {
            journalId: `payout-sent-${payoutId}`,
            entityType: "payout",
            entityId: payoutId,
            providerId: p.providerId.toString(),
            initiatedBy: admin.userId,
          },
          netPayout
        );
        await payoutRepository.updateById(payoutId, { ledgerJournalId: `payout-sent-${payoutId}` });
      } catch { /* non-critical */ }
    }

    // Post ledger reversal when payout is rejected (DR 2400 / CR 2100 — in-flight cleared, earnings restored)
    if (data.status === "rejected") {
      try {
        await ledgerService.postPayoutRejected(
          {
            journalId: `payout-rejected-${payoutId}`,
            entityType: "payout",
            entityId: payoutId,
            providerId: p.providerId.toString(),
            initiatedBy: admin.userId,
          },
          netPayout
        );
        // L21: Store the rejection journal ID in a dedicated field so the
        // original payout-requested journal ID (ledgerJournalId) is preserved.
        await payoutRepository.updateById(payoutId, { rejectionJournalId: `payout-rejected-${payoutId}` });
      } catch { /* non-critical */ }
    }

    // Notify provider
    const { notificationService } = await import("@/services/notification.service");

    const messages: Record<string, string> = {
      processing: "Your payout request is now being processed.",
      completed: `Your payout of ₱${p.amount.toLocaleString()} has been completed. Net amount sent: ₱${netPayout.toLocaleString()}.`,
      rejected: `Your payout request was rejected.${data.notes ? ` Reason: ${data.notes}` : ""} Note: the ₱${p.withdrawalFee ?? 0} withdrawal fee is non-refundable.`,
    };

    if (messages[data.status]) {
      await notificationService.push({
        userId: p.providerId.toString(),
        type: "payout_status_update",
        title: `Payout ${data.status}`,
        message: messages[data.status],
        data: { payoutId },
      });
    }

    await activityRepository.log({
      userId: admin.userId,
      eventType: "payout_updated",
      metadata: { payoutId, status: data.status, notes: data.notes },
    });

    return updated;
  }
}

export const payoutService = new PayoutService();
