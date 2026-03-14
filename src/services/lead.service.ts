/**
 * LeadService — manages the lead fee system for providers quoting on private jobs.
 *
 * Three modes (admin-configurable via payments.leadFeeMode):
 *   • pay_per_lead  — wallet debited each time a provider submits a quote
 *   • bid_credits   — provider buys credit tokens; each quote costs 1 token
 *   • subscription  — monthly unlimited plan; active subscribers quote for free
 *
 * Usage gate (called inside QuoteService.submitQuote before quote creation):
 *   await leadService.checkAndCharge(user, jobId)
 *
 * Exemptions:
 *   • payments.leadFeeEnabled === false → always free
 *   • job.invitedProviderId matches the requesting provider → free (direct invite)
 *
 * Refunds: none on per-lead / bid credit consumption.
 * Subscription cancellation stops future charges but does not refund the current period.
 */

import mongoose from "mongoose";
import { randomUUID } from "crypto";

import { getPaymentSettings } from "@/lib/appSettings";
import { walletRepository } from "@/repositories/wallet.repository";
import { leadSubscriptionRepository } from "@/repositories/leadSubscription.repository";
import { bidCreditAccountRepository } from "@/repositories/bidCreditAccount.repository";
import { ledgerService } from "@/services/ledger.service";
import { connectDB } from "@/lib/db";

import Job from "@/models/Job";

import {
  ForbiddenError,
  UnprocessableError,
  NotFoundError,
} from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";

let _createCheckoutSession: typeof import("@/lib/paymongo").createCheckoutSession | null = null;
async function getCreateCheckoutSession() {
  if (!_createCheckoutSession) {
    const mod = await import("@/lib/paymongo");
    _createCheckoutSession = mod.createCheckoutSession;
  }
  return _createCheckoutSession;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";

/** Standard bid credit pack sizes: [quantity, label] */
export const BID_CREDIT_PACKS = [
  { quantity: 5,  label: "Starter Pack (5 credits)"  },
  { quantity: 10, label: "Value Pack (10 credits)"    },
  { quantity: 20, label: "Pro Pack (20 credits)"      },
] as const;

export class LeadService {
  // ─────────────────────────────────────────────────────────────────────────
  // Gate — called by QuoteService before creating a quote
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check lead fee requirements and charge the provider if applicable.
   * Throws UnprocessableError with a helpful message if the provider cannot
   * proceed (insufficient funds / credits / no subscription).
   *
   * @param user     The authenticated provider
   * @param jobId    The job being quoted on
   * @param quoteId  The quote ID (for bid credit audit trail) — pass after quote creation
   */
  async checkAndCharge(user: TokenPayload, jobId: string, quoteId?: string): Promise<void> {
    if (user.role !== "provider") return; // defensive — route already enforces this

    const settings = await getPaymentSettings();
    const enabled = settings["payments.leadFeeEnabled"] as boolean;
    if (!enabled) return; // feature flag is off — free for everyone

    // ── Exempt: direct invite ─────────────────────────────────────────────
    await connectDB();
    const job = await Job.findById(jobId).select("invitedProviderId").lean() as { invitedProviderId?: mongoose.Types.ObjectId | null } | null;
    if (!job) throw new NotFoundError("Job");

    if (job.invitedProviderId?.toString() === user.userId) return; // direct invite — no charge

    // ── Charge by mode ────────────────────────────────────────────────────
    const mode = (settings["payments.leadFeeMode"] as string) || "pay_per_lead";

    if (mode === "subscription") {
      const sub = await leadSubscriptionRepository.findActiveByProvider(user.userId);
      if (!sub) {
        throw new UnprocessableError(
          "You need an active lead subscription to submit quotes. Purchase a monthly plan from your Lead Credits page."
        );
      }
      return; // subscriber — no additional charge
    }

    if (mode === "bid_credits") {
      const balance = await bidCreditAccountRepository.getBalance(user.userId);
      if (balance < 1) {
        throw new UnprocessableError(
          `You have no bid credits left. Purchase a credit pack from your Lead Credits page to submit quotes.`
        );
      }
      const result = await bidCreditAccountRepository.debitCredit(
        user.userId,
        1,
        {
          type: "spend",
          description: `Bid credit used — quote on job ${jobId}`,
          quoteId,
        }
      );
      if (!result) {
        // Race condition — re-check
        throw new UnprocessableError("Insufficient bid credits. Please purchase more credits and try again.");
      }
      // Post ledger entry for the credit usage
      const creditPrice = settings["payments.leadFeeBidCreditPrice"] as number ?? 10;
      const journalId = `lead-bid-credit-${user.userId}-${Date.now()}`;
      await ledgerService.postLeadFeePayment(
        {
          journalId,
          entityType: "quote",
          entityId: jobId,
          providerId: user.userId,
          initiatedBy: user.userId,
        },
        creditPrice,
        "bid_credit_purchase"
      );
      // Notify if low balance
      if (result.newBalance <= 3) {
        const { notificationService } = await import("@/services/notification.service");
        await notificationService.push({
          userId: user.userId,
          type: "system_notice",
          title: "Low bid credits",
          message: `You have ${result.newBalance} bid credit${result.newBalance !== 1 ? "s" : ""} remaining. Top up to keep submitting quotes.`,
          data: { page: "/provider/lead-credits" },
        });
      }
      return;
    }

    // Default: pay_per_lead
    const fee = settings["payments.leadFeePayPerLead"] as number ?? 30;
    const balance = await walletRepository.getBalance(user.userId);

    if (balance < fee) {
      throw new UnprocessableError(
        `Insufficient wallet balance. Submitting a quote costs ₱${fee.toLocaleString()} but your wallet has ₱${balance.toLocaleString()}. Please top up your wallet.`
      );
    }

    const { txDoc } = await walletRepository.applyTransaction(
      user.userId,
      -fee,
      "lead_fee_payment",
      `Lead fee — quote on job ${jobId}`
    );

    const journalId = `lead-ppl-${user.userId}-${Date.now()}`;
    await ledgerService.postLeadFeePayment(
      {
        journalId,
        entityType: "quote",
        entityId: jobId,
        providerId: user.userId,
        initiatedBy: user.userId,
      },
      fee,
      "pay_per_lead"
    );

    // Stamp ledger journal ID back on wallet transaction
    await walletRepository.setTransactionLedgerJournalId(
      (txDoc as { _id: { toString(): string } })._id.toString(),
      journalId
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bid Credit Purchases
  // ─────────────────────────────────────────────────────────────────────────

  async purchaseCreditsFromWallet(user: TokenPayload, quantity: number) {
    if (user.role !== "provider") throw new ForbiddenError("Only providers can purchase bid credits.");

    if (!BID_CREDIT_PACKS.find((p) => p.quantity === quantity)) {
      throw new UnprocessableError(`Invalid pack size. Available: ${BID_CREDIT_PACKS.map((p) => p.quantity).join(", ")}`);
    }

    const settings = await getPaymentSettings();
    const pricePerCredit = settings["payments.leadFeeBidCreditPrice"] as number ?? 10;
    const totalCost = pricePerCredit * quantity;

    const balance = await walletRepository.getBalance(user.userId);
    if (balance < totalCost) {
      throw new UnprocessableError(
        `Insufficient wallet balance. ${quantity} credits costs ₱${totalCost.toLocaleString()} but your wallet has ₱${balance.toLocaleString()}.`
      );
    }

    const { txDoc } = await walletRepository.applyTransaction(
      user.userId,
      -totalCost,
      "bid_credit_purchase",
      `Bid credits purchase — ${quantity} token(s) @ ₱${pricePerCredit}/credit`
    );

    const walletTxId = (txDoc as { _id: { toString(): string } })._id.toString();

    const journalId = `lead-credits-wallet-${user.userId}-${Date.now()}`;
    await ledgerService.postLeadFeePayment(
      {
        journalId,
        entityType: "quote",
        entityId: user.userId,
        providerId: user.userId,
        initiatedBy: user.userId,
      },
      totalCost,
      "bid_credit_purchase"
    );

    await walletRepository.setTransactionLedgerJournalId(walletTxId, journalId);

    await bidCreditAccountRepository.creditBalance(
      user.userId,
      quantity,
      {
        type: "purchase",
        description: `Purchased ${quantity} bid credit(s) via wallet`,
        walletTxId,
      }
    );

    const newBalance = await bidCreditAccountRepository.getBalance(user.userId);

    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: user.userId,
      type: "payment_confirmed",
      title: "Bid credits added!",
      message: `${quantity} bid credit${quantity !== 1 ? "s" : ""} added to your account. Balance: ${newBalance} credit${newBalance !== 1 ? "s" : ""}.`,
      data: { page: "/provider/lead-credits" },
    });

    return { quantity, totalCost, newBalance };
  }

  async initiateCreditsPayMongoCheckout(user: TokenPayload, quantity: number) {
    if (user.role !== "provider") throw new ForbiddenError("Only providers can purchase bid credits.");

    if (!BID_CREDIT_PACKS.find((p) => p.quantity === quantity)) {
      throw new UnprocessableError("Invalid pack size.");
    }

    if (!process.env.PAYMONGO_SECRET_KEY) {
      return this.purchaseCreditsFromWallet(user, quantity);
    }

    const settings = await getPaymentSettings();
    const pricePerCredit = settings["payments.leadFeeBidCreditPrice"] as number ?? 10;
    const totalCost = pricePerCredit * quantity;

    const createCheckoutSession = await getCreateCheckoutSession();
    const session = await createCheckoutSession({
      amountPHP:    totalCost,
      description:  `Bid Credits — ${quantity} token${quantity !== 1 ? "s" : ""}`,
      lineItemName: `Bid Credits (${quantity} token${quantity !== 1 ? "s" : ""})`,
      successUrl:   `${APP_URL}/provider/lead-credits?payment=success`,
      cancelUrl:    `${APP_URL}/provider/lead-credits?payment=cancelled`,
      metadata: {
        type:       "lead_credits",
        providerId: user.userId,
        quantity:   String(quantity),
        amountPHP:  String(totalCost),
      },
    });

    return {
      checkoutUrl: session.checkoutUrl,
      checkoutSessionId: session.id,
    };
  }

  async activateCreditsFromWebhook(
    providerId: string,
    quantity: number,
    sessionId: string,
    amountPaid: number
  ) {
    // Idempotency check
    const existing = await bidCreditAccountRepository.findCreditTransactionByPaymongoSession(sessionId);
    if (existing) return;

    const journalId = `lead-credits-pm-${providerId}-${Date.now()}`;
    await ledgerService.postLeadFeePayment(
      {
        journalId,
        entityType: "quote",
        entityId: providerId,
        providerId,
        initiatedBy: providerId,
      },
      amountPaid,
      "bid_credit_purchase"
    );

    await bidCreditAccountRepository.creditBalance(
      providerId,
      quantity,
      {
        type: "purchase",
        description: `Purchased ${quantity} bid credit(s) via PayMongo`,
        paymongoSessionId: sessionId,
      }
    );

    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: providerId,
      type: "payment_confirmed",
      title: "Bid credits added!",
      message: `${quantity} bid credit${quantity !== 1 ? "s" : ""} added to your account.`,
      data: { page: "/provider/lead-credits" },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Subscription
  // ─────────────────────────────────────────────────────────────────────────

  async purchaseSubscriptionFromWallet(user: TokenPayload) {
    if (user.role !== "provider") throw new ForbiddenError("Only providers can purchase subscriptions.");

    const settings = await getPaymentSettings();
    const price = settings["payments.leadFeeSubscriptionMonthly"] as number ?? 499;

    const balance = await walletRepository.getBalance(user.userId);
    if (balance < price) {
      throw new UnprocessableError(
        `Insufficient wallet balance. Monthly subscription costs ₱${price.toLocaleString()} but your wallet has ₱${balance.toLocaleString()}.`
      );
    }

    const { txDoc } = await walletRepository.applyTransaction(
      user.userId,
      -price,
      "lead_subscription_payment",
      `Lead subscription — monthly unlimited leads`
    );

    const walletTxId = (txDoc as { _id: { toString(): string } })._id.toString();

    const now      = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const sub = await leadSubscriptionRepository.create({
      providerId: user.userId,
      startsAt: now,
      expiresAt,
      amountPaid: price,
      walletTxId,
    });

    const subId = (sub as { _id: { toString(): string } })._id.toString();
    const journalId = `lead-sub-wallet-${subId}`;

    await ledgerService.postLeadFeePayment(
      {
        journalId,
        entityType: "lead_subscription",
        entityId: subId,
        providerId: user.userId,
        initiatedBy: user.userId,
      },
      price,
      "lead_subscription"
    );

    await walletRepository.setTransactionLedgerJournalId(walletTxId, journalId);
    await leadSubscriptionRepository.updateStatus(subId, "active");

    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: user.userId,
      type: "payment_confirmed",
      title: "Lead subscription activated!",
      message: `Your unlimited-leads subscription is active until ${expiresAt.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}. Quote freely!`,
      data: { page: "/provider/lead-credits" },
    });

    return { activated: true, subscription: sub, expiresAt };
  }

  async initiateSubscriptionPayMongoCheckout(user: TokenPayload) {
    if (user.role !== "provider") throw new ForbiddenError("Only providers can purchase subscriptions.");

    if (!process.env.PAYMONGO_SECRET_KEY) {
      return this.purchaseSubscriptionFromWallet(user);
    }

    const settings = await getPaymentSettings();
    const price = settings["payments.leadFeeSubscriptionMonthly"] as number ?? 499;

    const createCheckoutSession = await getCreateCheckoutSession();
    const session = await createCheckoutSession({
      amountPHP:    price,
      description:  "Unlimited Leads — Monthly Subscription (30 days)",
      lineItemName: "Lead Subscription (monthly)",
      successUrl:   `${APP_URL}/provider/lead-credits?payment=success`,
      cancelUrl:    `${APP_URL}/provider/lead-credits?payment=cancelled`,
      metadata: {
        type:       "lead_subscription",
        providerId: user.userId,
        amountPHP:  String(price),
      },
    });

    return {
      activated: false,
      checkoutUrl: session.checkoutUrl,
      checkoutSessionId: session.id,
    };
  }

  async activateSubscriptionFromWebhook(
    providerId: string,
    sessionId: string,
    amountPaid: number
  ) {
    // Idempotency check
    const existing = await leadSubscriptionRepository.findByPaymongoSession(sessionId);
    if (existing) return;

    const now      = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const sub = await leadSubscriptionRepository.create({
      providerId,
      startsAt: now,
      expiresAt,
      amountPaid,
      paymongoSessionId: sessionId,
    });

    const subId = (sub as { _id: { toString(): string } })._id.toString();
    const journalId = `lead-sub-pm-${subId}`;

    await ledgerService.postLeadFeePayment(
      {
        journalId,
        entityType: "lead_subscription",
        entityId: subId,
        providerId,
        initiatedBy: providerId,
      },
      amountPaid,
      "lead_subscription"
    );

    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: providerId,
      type: "payment_confirmed",
      title: "Lead subscription activated!",
      message: `Your unlimited-leads subscription is active until ${expiresAt.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}.`,
      data: { page: "/provider/lead-credits" },
    });
  }

  async cancelSubscription(user: TokenPayload, subscriptionId: string) {
    const sub = await leadSubscriptionRepository.findById(subscriptionId);
    if (!sub) throw new NotFoundError("Subscription");

    const subDoc = sub as unknown as { providerId: { toString(): string }; status: string };
    if (subDoc.providerId.toString() !== user.userId)
      throw new ForbiddenError("Not your subscription.");

    if (subDoc.status !== "active")
      throw new UnprocessableError("Subscription is not active.");

    await leadSubscriptionRepository.updateStatus(subscriptionId, "cancelled");
    return { cancelled: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Read methods
  // ─────────────────────────────────────────────────────────────────────────

  async getStatus(userId: string) {
    const [activeSubscription, creditBalance, history] = await Promise.all([
      leadSubscriptionRepository.findActiveByProvider(userId),
      bidCreditAccountRepository.getBalance(userId),
      leadSubscriptionRepository.findAllByProvider(userId),
    ]);
    return { activeSubscription, creditBalance, history };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cron
  // ─────────────────────────────────────────────────────────────────────────

  async expireStaleSubscriptions() {
    const expired = await leadSubscriptionRepository.expireStale();
    return { expired };
  }
}

export const leadService = new LeadService();
