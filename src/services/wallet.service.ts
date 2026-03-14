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
import { getEffectiveCommissionRate } from "@/lib/serverCommission";
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
    opts?: { jobId?: string; refId?: string; silent?: boolean; journalId?: string }
  ): Promise<number> {
    if (amount <= 0) throw new UnprocessableError("Credit amount must be positive");

    const { newBalance, txDoc } = await walletRepository.applyTransaction(
      userId,
      amount,
      "refund_credit",
      description,
      { jobId: opts?.jobId, refId: opts?.refId }
    );

    // Stamp ledger journal reference on the WalletTransaction for traceability
    if (opts?.journalId) {
      try {
        await walletRepository.setTransactionLedgerJournalId(
          (txDoc as unknown as { _id: { toString(): string } })._id.toString(),
          opts.journalId
        );
      } catch { /* non-critical */ }
    }

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

  /**
   * Debit a user's wallet (e.g. for a dispute handling fee).
   * Returns { success: false } silently if the balance is insufficient.
   */
  async debit(
    userId: string,
    amount: number,
    description: string,
    opts?: { refId?: string; silent?: boolean }
  ): Promise<{ success: boolean; newBalance: number }> {
    if (amount <= 0) throw new UnprocessableError("Debit amount must be positive");

    const balance = await walletRepository.getBalance(userId);
    if (balance < amount) return { success: false, newBalance: balance };

    const { newBalance } = await walletRepository.applyTransaction(
      userId,
      -amount,
      "admin_debit",
      description,
      { refId: opts?.refId }
    );

    if (!opts?.silent) {
      const note = await notificationRepository.create({
        userId,
        type: "wallet_debited" as never,
        title: "Wallet debited",
        message: `₱${amount.toLocaleString()} has been deducted from your wallet. ${description}`,
        data: {},
      });
      pushNotification(userId, note);
    }

    return { success: true, newBalance };
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
    const { txDoc: escrowPaymentTxDoc } = await walletRepository.applyTransaction(
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
    const rate = await getEffectiveCommissionRate((job as unknown as { category: string }).category, user.userId);
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
    // Stamp journalId on the WalletTransaction (escrow_payment) for traceability
    try {
      await walletRepository.setTransactionLedgerJournalId(
        (escrowPaymentTxDoc as unknown as { _id: { toString(): string } })._id.toString(),
        journalId
      );
    } catch { /* non-critical */ }

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

  // ── Wallet top-up via PayMongo ───────────────────────────────────────────

  /**
   * Create a PayMongo checkout session for a wallet top-up.
   * Returns the checkout URL to redirect the user.
   *
   * Journal (posted on webhook confirmation):
   *   DR 1000 Gateway Receivable   amount  ← cash received
   *   CR 2200 Wallet Payable       amount  ← wallet balance increases
   */
  async topUpWithGateway(
    user: TokenPayload,
    amountPHP: number,
    baseUrl: string
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
    if (amountPHP < 100) {
      throw new UnprocessableError("Minimum top-up amount is ₱100");
    }
    if (amountPHP > 100_000) {
      throw new UnprocessableError("Maximum top-up amount is ₱100,000 per transaction");
    }

    const { createCheckoutSession } = await import("@/lib/paymongo");

    const session = await createCheckoutSession({
      amountPHP,
      description: `Wallet top-up — ₱${amountPHP.toLocaleString()}`,
      lineItemName: "Wallet Top-Up",
      successUrl: `${baseUrl}/client/wallet?topup=success`,
      cancelUrl:  `${baseUrl}/client/wallet?topup=cancelled`,
      metadata: {
        type:       "wallet_topup",
        userId:     user.userId,
        amountPHP:  String(amountPHP),
      },
    });

    return { checkoutUrl: session.checkoutUrl, sessionId: session.id };
  }

  /**
   * Called from the success-redirect page. Fetches the checkout session from
   * PayMongo to verify it was actually paid, then calls topUpConfirm (idempotent).
   * This is the primary confirmation path — the webhook is a redundant fallback.
   */
  async topUpVerifyAndConfirm(userId: string, sessionId: string): Promise<"credited" | "already_done" | "not_paid"> {
    const { getCheckoutSession } = await import("@/lib/paymongo");
    const session = await getCheckoutSession(sessionId);

    const isPaid =
      session.paymentIntentStatus === "succeeded" ||
      session.status === "paid";

    if (!isPaid) return "not_paid";

    // Check idempotency: if fully processed (wallet + ledger), return early.
    // If only partially processed (wallet credited, ledger missing), fall through
    // to topUpConfirm which handles the recovery path.
    const { connectDB } = await import("@/lib/db");
    await connectDB();
    const WalletTransaction = (await import("@/models/WalletTransaction")).default;
    const existing = await WalletTransaction.findOne({ refId: sessionId })
      .select("ledgerJournalId")
      .lean() as { ledgerJournalId?: string | null } | null;

    if (existing?.ledgerJournalId) return "already_done";

    // Retrieve the charged amount from the payment intent (authoritative source)
    const { getPaymentIntent } = await import("@/lib/paymongo");
    let amountPHP = 0;
    if (session.paymentIntentId) {
      const pi = await getPaymentIntent(session.paymentIntentId);
      amountPHP = pi.amountCentavos / 100;
    }

    if (amountPHP <= 0) return "not_paid";

    await this.topUpConfirm(userId, amountPHP, sessionId, userId);
    return existing ? "already_done" : "credited"; // wallet existed → ledger retry, else fresh credit
  }

  /**
   * Credits the wallet, posts the ledger journal entry, and stamps the
   * ledger journal ID on the wallet transaction for traceability.
   *
   * Idempotent with recovery:
   *   - If sessionId already has a WalletTransaction AND a ledgerJournalId → fully done, skip.
   *   - If wallet transaction exists but ledgerJournalId is null → wallet was credited on a
   *     previous attempt but the ledger write failed; retry the ledger only.
   *   - If nothing exists → full flow: credit wallet, post ledger, stamp journalId.
   */
  async topUpConfirm(
    userId: string,
    amountPHP: number,
    sessionId: string,
    webhookInitiatedBy?: string
  ): Promise<void> {
    const { connectDB } = await import("@/lib/db");
    await connectDB();
    const WalletTransaction = (await import("@/models/WalletTransaction")).default;

    type TxLean = { _id: { toString(): string }; ledgerJournalId?: string | null };
    const existing = await WalletTransaction.findOne({ refId: sessionId })
      .select("_id ledgerJournalId")
      .lean() as TxLean | null;

    const journalId = `wallet-topup-${sessionId}`;

    if (existing) {
      // Wallet already credited — check if the ledger entry was also written.
      if (!existing.ledgerJournalId) {
        // Partial failure recovery: retry the ledger write only.
        console.warn(`[WALLET TOPUP] Retrying missing ledger for session ${sessionId}`);
        const txId = existing._id.toString();
        try {
          await ledgerService.postWalletFundedGateway(
            {
              journalId,
              entityType:  "wallet_topup",
              entityId:    txId,   // ← MongoDB ObjectId, not the session string
              clientId:    userId,
              initiatedBy: webhookInitiatedBy ?? userId,
            },
            amountPHP
          );
          await WalletTransaction.findByIdAndUpdate(txId, { ledgerJournalId: journalId });
          console.log(`[WALLET TOPUP] Ledger recovery succeeded for session ${sessionId}`);
        } catch (e) {
          console.error(`[WALLET TOPUP] Ledger recovery failed for session ${sessionId}`, e);
        }
      } else {
        console.log(`[WALLET TOPUP] Session ${sessionId} fully processed — skipping`);
      }
      return;
    }

    // ── Full flow ─────────────────────────────────────────────────────────────

    // 1. Credit the wallet (creates WalletTransaction with refId = sessionId)
    const { txDoc } = await walletRepository.applyTransaction(
      userId,
      amountPHP,
      "topup",
      `Wallet top-up via PayMongo — ₱${amountPHP.toLocaleString()}`,
      { refId: sessionId }
    );
    const txId = (txDoc as unknown as { _id: { toString(): string } })._id.toString();

    // 2. Post ledger: DR 1000 Gateway Receivable / CR 2200 Wallet Payable
    //    entityId uses the WalletTransaction's MongoDB _id (valid ObjectId).
    try {
      await ledgerService.postWalletFundedGateway(
        {
          journalId,
          entityType:  "wallet_topup",
          entityId:    txId,
          clientId:    userId,
          initiatedBy: webhookInitiatedBy ?? userId,
        },
        amountPHP
      );
      // 3. Stamp journal ID for traceability
      await WalletTransaction.findByIdAndUpdate(txId, { ledgerJournalId: journalId });
    } catch (e) {
      // Wallet is already credited — do not throw. The ledger can be recovered on
      // the next call via the partial-failure path above.
      console.error(`[WALLET TOPUP] Ledger write failed for session ${sessionId} (tx ${txId})`, e);
    }

    // 4. Notify user (non-critical)
    try {
      const note = await notificationRepository.create({
        userId,
        type:    "wallet_credited" as never,
        title:   "Wallet topped up",
        message: `₱${amountPHP.toLocaleString()} has been added to your wallet.`,
        data:    { source: "topup", sessionId },
      });
      pushNotification(userId, note);
    } catch (e) {
      console.error(`[WALLET TOPUP] Notification failed for session ${sessionId}`, e);
    }
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
    await walletRepository.setWithdrawalLedgerJournalId(
      withdrawal._id!.toString(),
      `wallet-withdraw-${withdrawal._id?.toString()}`
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
      const { txDoc: reversedTxDoc } = await walletRepository.applyTransaction(
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
      await walletRepository.setWithdrawalLedgerJournalId(
        withdrawalId,
        `wallet-withdraw-reversed-${withdrawalId}`
      );
      // Stamp journalId on the reversal WalletTransaction for traceability
      try {
        await walletRepository.setTransactionLedgerJournalId(
          (reversedTxDoc as unknown as { _id: { toString(): string } })._id.toString(),
          `wallet-withdraw-reversed-${withdrawalId}`
        );
      } catch { /* non-critical */ }

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
      // Commit the reservation: deduct balance + release reservedAmount atomically, create WalletTransaction
      const { txDoc: completedTxDoc } = await walletRepository.commitReservationWithTx(
        w.userId.toString(),
        w.amount,
        `Withdrawal sent to bank — ₱${w.amount.toLocaleString()}`,
        { refId: withdrawalId }
      );
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
      await walletRepository.setWithdrawalLedgerJournalId(
        withdrawalId,
        `wallet-withdraw-completed-${withdrawalId}`
      );
      // Stamp journalId on the withdrawal WalletTransaction for traceability
      try {
        await walletRepository.setTransactionLedgerJournalId(
          (completedTxDoc as unknown as { _id: { toString(): string } })._id.toString(),
          `wallet-withdraw-completed-${withdrawalId}`
        );
      } catch { /* non-critical */ }

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
