/**
 * WalletService
 *
 * Manages the platform credit wallet for clients.
 *
 * Flow:
 *  - Refunds credit the wallet instead of reversing via PayMongo.
 *  - Clients can pay escrow directly from wallet balance.
 *  - Clients can request a cash withdrawal to their bank account.
 *  - Admin approves / processes withdrawals.
 */

import { walletRepository } from "@/repositories/wallet.repository";
import { activityRepository, notificationRepository, jobRepository, transactionRepository } from "@/repositories";
import { pushNotification, pushStatusUpdateMany } from "@/lib/events";
import { UnprocessableError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { canTransitionEscrow } from "@/lib/jobLifecycle";
import { calculateCommission } from "@/lib/commission";
import { getDbCommissionRate } from "@/lib/serverCommission";
import { ledgerService } from "@/services/ledger.service";
import type { TokenPayload } from "@/lib/auth";
import type { IJob } from "@/types";

export class WalletService {
  // ── Credits ───────────────────────────────────────────────────────────────

  /**
   * Credit a user's wallet (e.g. on refund).
   * Sends a push notification automatically.
   */
  async credit(
    userId: string,
    amount: number,
    description: string,
    opts?: { jobId?: string; refId?: string; silent?: boolean }
  ): Promise<number> {
    if (amount <= 0) throw new UnprocessableError("Credit amount must be positive");

    const { newBalance } = await walletRepository.applyTransaction(
      userId,
      amount,
      "refund_credit",
      description,
      { jobId: opts?.jobId, refId: opts?.refId }
    );

    if (!opts?.silent) {
      const note = await notificationRepository.create({
        userId,
        type: "wallet_credited" as never,
        title: "Wallet credited",
        message: `₱${amount.toLocaleString()} has been added to your wallet. New balance: ₱${newBalance.toLocaleString()}.`,
        data: { jobId: opts?.jobId },
      });
      pushNotification(userId, note);
    }

    return newBalance;
  }

  // ── Escrow funding from wallet ────────────────────────────────────────────

  async fundEscrowFromWallet(user: TokenPayload, jobId: string, overrideAmount?: number) {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & { save(): Promise<void> };

    if (job.clientId.toString() !== user.userId) throw new ForbiddenError();

    const check = canTransitionEscrow(job, "funded");
    if (!check.allowed) throw new UnprocessableError(check.reason!);

    const amount = overrideAmount ?? job.budget;

    // Check wallet balance (exclude pending withdrawals)
    const balance = await walletRepository.getBalance(user.userId);
    const pendingOut = await walletRepository.sumPendingWithdrawals(user.userId);
    const available = balance - pendingOut;

    if (available < amount) {
      throw new UnprocessableError(
        `Insufficient wallet balance. Available: ₱${available.toLocaleString()}, required: ₱${amount.toLocaleString()}`
      );
    }

    // Debit wallet
    await walletRepository.applyTransaction(
      user.userId,
      -amount,
      "escrow_payment",
      `Escrow for job: ${(job as unknown as { title?: string }).title ?? jobId}`,
      { jobId }
    );

    // Fund escrow
    job.escrowStatus = "funded";
    await jobDoc.save();

    // Create transaction record for provider payout tracking
    const rate = await getDbCommissionRate((job as unknown as { category: string }).category);
    const { commission, netAmount } = calculateCommission(amount, rate);
    const tx = await transactionRepository.create({
      jobId: job._id,
      payerId: user.userId,
      payeeId: job.providerId,
      amount,
      commission,
      netAmount,
      status: "pending",
      currency: "PHP",
      commissionRate: rate,
      chargeType: "job_escrow",
    });

    const journalId = `escrow-fund-wallet-${job._id!.toString()}`;
    await ledgerService.postEscrowFundedWallet(
      {
        journalId,
        entityType: "job",
        entityId: job._id!.toString(),
        clientId: user.userId,
        providerId: job.providerId?.toString(),
        initiatedBy: user.userId,
      },
      amount
    );
    await transactionRepository.updateById((tx as { _id: { toString(): string } })._id.toString(), { ledgerJournalId: journalId });

    await activityRepository.log({
      userId: user.userId,
      eventType: "escrow_funded",
      jobId: job._id!.toString(),
      metadata: { amount, source: "wallet" },
    });

    // Notify provider
    if (job.providerId) {
      const { notificationService } = await import("@/services/notification.service");
      await notificationService.push({
        userId: job.providerId.toString(),
        type: "escrow_funded",
        title: "Escrow funded",
        message: "The client has funded escrow. You may begin work.",
        data: { jobId: job._id!.toString() },
      });
    }

    pushStatusUpdateMany(
      [user.userId, job.providerId?.toString()].filter(Boolean) as string[],
      { entity: "job", id: job._id!.toString(), escrowStatus: "funded" }
    );

    return { success: true, message: `Escrow of ₱${amount.toLocaleString()} funded from wallet.` };
  }

  // ── Balance + history ─────────────────────────────────────────────────────

  async getWallet(userId: string) {
    const [balance, pendingWithdrawals, transactions, withdrawals] = await Promise.all([
      walletRepository.getBalance(userId),
      walletRepository.sumPendingWithdrawals(userId),
      walletRepository.listTransactions(userId),
      walletRepository.listWithdrawals(userId),
    ]);

    return {
      balance,
      pendingWithdrawals,
      availableBalance: Math.max(0, balance - pendingWithdrawals),
      transactions,
      withdrawals,
    };
  }

  // ── Withdrawal requests ───────────────────────────────────────────────────

  async requestWithdrawal(
    user: TokenPayload,
    data: { amount: number; bankName: string; accountNumber: string; accountName: string }
  ) {
    const { amount, bankName, accountNumber, accountName } = data;

    if (!amount || amount < 100) {
      throw new UnprocessableError("Minimum withdrawal amount is ₱100");
    }
    if (!bankName?.trim() || !accountNumber?.trim() || !accountName?.trim()) {
      throw new UnprocessableError("Bank name, account number, and account name are required");
    }

    const balance = await walletRepository.getBalance(user.userId);
    const pendingOut = await walletRepository.sumPendingWithdrawals(user.userId);
    const available = balance - pendingOut;

    if (amount > available) {
      throw new UnprocessableError(
        `Requested amount exceeds available balance of ₱${available.toLocaleString()}`
      );
    }

    // Atomically reserve the amount so it can't be double-spent while pending
    await walletRepository.reserveBalance(user.userId, amount);

    const withdrawal = await walletRepository.createWithdrawal({
      userId: user.userId,
      amount,
      bankName:      bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountName:   accountName.trim(),
    });

    await ledgerService.postWalletWithdrawalRequested(
      {
        journalId: `wallet-withdraw-${withdrawal._id?.toString()}`,
        entityType: "wallet_withdrawal",
        entityId: withdrawal._id!.toString(),
        clientId: user.userId,
        initiatedBy: user.userId,
      },
      amount
    );

    await activityRepository.log({
      userId: user.userId,
      eventType: "payout_requested" as never,
      metadata: { source: "wallet", withdrawalId: withdrawal._id?.toString(), amount },
    });

    const note = await notificationRepository.create({
      userId: user.userId,
      type: "wallet_withdrawal_update" as never,
      title: "Withdrawal request submitted",
      message: `Your withdrawal of ₱${amount.toLocaleString()} is pending review.`,
      data: {},
    });
    pushNotification(user.userId, note);

    return withdrawal;
  }

  // ── Admin: update withdrawal status ──────────────────────────────────────

  async updateWithdrawal(
    admin: TokenPayload,
    withdrawalId: string,
    status: "processing" | "completed" | "rejected",
    notes?: string
  ) {
    if (admin.role !== "admin" && admin.role !== "staff") throw new ForbiddenError();

    const withdrawal = await walletRepository.findWithdrawalById(withdrawalId);
    if (!withdrawal) throw new NotFoundError("Withdrawal request");

    const w = withdrawal as unknown as {
      userId: { toString(): string };
      amount: number;
      status: string;
    };

    // If rejecting, release the reservation back to the wallet
    if (status === "rejected" && w.status !== "rejected") {
      await walletRepository.releaseReservation(w.userId.toString(), w.amount);
      await walletRepository.applyTransaction(
        w.userId.toString(),
        w.amount,
        "withdrawal_reversed",
        `Withdrawal rejected: ${notes ?? "Admin decision"}`,
        { refId: withdrawalId }
      );

      await ledgerService.postWalletWithdrawalReversed(
        {
          journalId: `wallet-withdraw-reversed-${withdrawalId}`,
          entityType: "wallet_withdrawal",
          entityId: withdrawalId,
          clientId: w.userId.toString(),
          initiatedBy: admin.userId,
        },
        w.amount
      );

      // Notify user
      const note = await notificationRepository.create({
        userId: w.userId.toString(),
        type: "wallet_withdrawal_update" as never,
        title: "Withdrawal rejected",
        message: `Your withdrawal of ₱${w.amount.toLocaleString()} was rejected. The amount has been returned to your wallet.${notes ? ` Reason: ${notes}` : ""}`,
        data: {},
      });
      pushNotification(w.userId.toString(), note);
    } else if (status === "completed" && w.status !== "completed") {
      // Commit the reservation: deduct balance + release reservedAmount atomically
      await walletRepository.commitReservation(w.userId.toString(), w.amount);
      await ledgerService.postWalletWithdrawalCompleted(
        {
          journalId: `wallet-withdraw-completed-${withdrawalId}`,
          entityType: "wallet_withdrawal",
          entityId: withdrawalId,
          clientId: w.userId.toString(),
          initiatedBy: admin.userId,
        },
        w.amount
      );

      const note = await notificationRepository.create({
        userId: w.userId.toString(),
        type: "wallet_withdrawal_update" as never,
        title: "Withdrawal completed",
        message: `Your withdrawal of ₱${w.amount.toLocaleString()} has been sent to your bank account.`,
        data: {},
      });
      pushNotification(w.userId.toString(), note);
    }

    const updated = await walletRepository.updateWithdrawalStatus(withdrawalId, status, notes);

    await activityRepository.log({
      userId: admin.userId,
      eventType: "payout_updated" as never,
      metadata: { source: "wallet_withdrawal", withdrawalId, status, notes },
    });

    return updated;
  }
}

export const walletService = new WalletService();
