import { payoutRepository } from "@/repositories/payout.repository";
import { transactionRepository, activityRepository } from "@/repositories";
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

    await activityRepository.log({
      userId: user.userId,
      eventType: "payout_requested",
      metadata: { payoutId: payout._id?.toString(), amount },
    });

    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: user.userId,
      type: "payout_requested",
      title: "Payout request submitted",
      message: `Your payout of ₱${amount.toLocaleString()} has been submitted and is pending review.`,
      data: { payoutId: payout._id?.toString() },
    });

    return payout;
  }

  /** List payouts for the authenticated provider. */
  async listProviderPayouts(user: TokenPayload) {
    if (user.role !== "provider") throw new ForbiddenError();
    const payouts = await payoutRepository.findByProvider(user.userId);
    const available = await this.getAvailableBalance(user.userId);
    return { payouts, availableBalance: available };
  }

  /** Admin: list all payout requests. */
  async listAllPayouts() {
    return payoutRepository.findAllWithProvider();
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

    // Notify provider
    const p = payout as unknown as { providerId: { toString(): string }; amount: number };
    const { notificationService } = await import("@/services/notification.service");

    const messages: Record<string, string> = {
      processing: "Your payout request is now being processed.",
      completed: `Your payout of ₱${p.amount.toLocaleString()} has been completed.`,
      rejected: `Your payout request was rejected.${data.notes ? ` Reason: ${data.notes}` : ""}`,
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
