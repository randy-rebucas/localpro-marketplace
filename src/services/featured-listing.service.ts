/**
 * FeaturedListingService — manages provider boost / featured listing purchases.
 *
 * Three boost tiers are available, each costing a flat PHP fee per week:
 *   • featured_provider  — ₱199/week — appears at the top of marketplace search with badge
 *   • top_search         — ₱299/week — pinned at the top of category-filtered searches
 *   • homepage_highlight — ₱499/week — shown in the premium panel on the find-a-provider page
 *
 * Payment flow:
 *   1. Provider calls POST /api/provider/boost { type, payWith: "wallet" | "paymongo" }
 *   2a. wallet   → debit wallet, create FeaturedListing (status: active), post ledger entry
 *   2b. paymongo → create PayMongo checkout session, return checkoutUrl (listing not yet active)
 *         On webhook → activateFromWebhook() is called → listing status set to active
 *
 * Duration: fixed 7 days (startsAt = now, expiresAt = startsAt + 7 days).
 * Stacking: all three types can be active simultaneously.
 * Refunds: none — fee is non-refundable once purchase is confirmed.
 */

import { getPaymentSettings } from "@/lib/appSettings";
import { walletRepository } from "@/repositories/wallet.repository";
import { featuredListingRepository } from "@/repositories/featuredListing.repository";
import { ledgerService } from "@/services/ledger.service";
import { createCheckoutSession } from "@/lib/paymongo";
import { ForbiddenError, UnprocessableError, NotFoundError } from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import type { FeaturedListingType } from "@/types";
import { FEATURED_LISTING_LABELS } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";

const SETTING_KEY: Record<FeaturedListingType, string> = {
  featured_provider:  "payments.featuredListingFeaturedProvider",
  top_search:         "payments.featuredListingTopSearch",
  homepage_highlight: "payments.featuredListingHomepage",
};

const DEFAULT_PRICE: Record<FeaturedListingType, number> = {
  featured_provider:  199,
  top_search:         299,
  homepage_highlight: 499,
};

export class FeaturedListingService {
  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async getPrice(type: FeaturedListingType): Promise<number> {
    const settings = await getPaymentSettings();
    const key = SETTING_KEY[type] as keyof typeof settings;
    const val = settings[key];
    return typeof val === "number" && val > 0 ? val : DEFAULT_PRICE[type];
  }

  private buildJournalId(listingId: string) {
    return `featured-listing-${listingId}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Purchase a featured listing boost using the provider's platform wallet.
   * Returns the newly created FeaturedListing document.
   */
  async purchaseFromWallet(user: TokenPayload, type: FeaturedListingType) {
    if (user.role !== "provider")
      throw new ForbiddenError("Only providers can purchase boosts.");

    const price = await this.getPrice(type);
    const balance = await walletRepository.getBalance(user.userId);

    if (balance < price) {
      throw new UnprocessableError(
        `Insufficient wallet balance. You have ₱${balance.toLocaleString()} but this boost costs ₱${price.toLocaleString()}.`
      );
    }

    const now      = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Debit wallet — atomic transaction
    const { txDoc } = await walletRepository.applyTransaction(
      user.userId,
      -price,
      "featured_listing_payment",
      `Featured listing — ${FEATURED_LISTING_LABELS[type]} (1 week)`
    );

    // Create listing record
    const listing = await featuredListingRepository.create({
      providerId: user.userId,
      type,
      startsAt: now,
      expiresAt,
      amountPaid: price,
      walletTxId: (txDoc as { _id: { toString(): string } })._id.toString(),
    });

    const listingId = (listing as { _id: { toString(): string } })._id.toString();

    // Post double-entry ledger journal
    const journalId = this.buildJournalId(listingId);
    await ledgerService.postFeaturedListingPayment(
      {
        journalId,
        entityType: "featured_listing",
        entityId: listingId,
        providerId: user.userId,
        initiatedBy: user.userId,
      },
      price
    );

    // Stamp ledger journal ID back on the listing
    await featuredListingRepository.updateById(listingId, { ledgerJournalId: journalId });

    // Push notification
    const { getNotificationT } = await import("@/services/notification.service");
    const t = await getNotificationT(user.userId);
    const { notificationRepository } = await import("@/repositories");
    await notificationRepository.create({
      userId: user.userId,
      type: "payment_confirmed",
      title: t("boostActivatedTitle"),
      message: t("boostActivatedMessage", { boostType: FEATURED_LISTING_LABELS[type], amount: price.toLocaleString() }),
      data: { listingId },
    });

    return { activated: true, listing };
  }

  /**
   * Initiate a PayMongo checkout session for a featured listing boost.
   * The listing is NOT yet created — it will be activated by the webhook.
   * Returns { checkoutUrl } so the caller can redirect the provider.
   */
  async initiatePayMongoCheckout(user: TokenPayload, type: FeaturedListingType) {
    if (user.role !== "provider")
      throw new ForbiddenError("Only providers can purchase boosts.");

    // Check if PAYMONGO_SECRET_KEY is available; if not, simulate
    if (!process.env.PAYMONGO_SECRET_KEY) {
      // Dev / simulated path — activate immediately
      return this.purchaseFromWallet(user, type);
    }

    const price = await this.getPrice(type);
    const label = FEATURED_LISTING_LABELS[type];

    const session = await createCheckoutSession({
      amountPHP:    price,
      description:  `${label} boost — 1 week`,
      lineItemName: label,
      successUrl:   `${APP_URL}/api/payment-return?to=${encodeURIComponent(`/provider/boost?payment=success&type=${type}`)}`,
      cancelUrl:    `${APP_URL}/provider/boost?payment=cancelled`,
      metadata: {
        type:        "featured_listing",
        listingType: type,
        providerId:  user.userId,
        amountPHP:   String(price),
      },
    });

    return {
      activated: false,
      checkoutUrl: session.checkoutUrl,
      checkoutSessionId: session.id,
    };
  }

  /**
   * Called from the PayMongo webhook when a featured_listing checkout is paid.
   * Creates and activates the listing.
   */
  async activateFromWebhook(
    providerId: string,
    listingType: FeaturedListingType,
    sessionId: string,
    amountPaid: number
  ) {
    // Idempotency — if a listing for this session already exists, skip
    const existing = await featuredListingRepository.findByPaymongoSession(sessionId);
    if (existing) return;

    const now       = new Date();
    const expiresAt  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const listing = await featuredListingRepository.create({
      providerId,
      type: listingType,
      startsAt: now,
      expiresAt,
      amountPaid,
      paymongoSessionId: sessionId,
    });

    const listingId = (listing as { _id: { toString(): string } })._id.toString();

    const journalId = this.buildJournalId(listingId);
    await ledgerService.postFeaturedListingPayment(
      {
        journalId,
        entityType: "featured_listing",
        entityId: listingId,
        providerId,
        initiatedBy: providerId,
      },
      amountPaid
    );

    await featuredListingRepository.updateById(listingId, { ledgerJournalId: journalId });

    const { getNotificationT } = await import("@/services/notification.service");
    const t = await getNotificationT(providerId);
    const { notificationRepository } = await import("@/repositories");
    await notificationRepository.create({
      userId: providerId,
      type: "payment_confirmed",
      title: t("boostActivatedTitle"),
      message: t("boostActivatedProviderMessage", { boostType: FEATURED_LISTING_LABELS[listingType] }),
      data: { listingId },
    });
  }

  /**
   * Cancel an active boost (no refund). Only the owning provider can cancel.
   */
  async cancel(user: TokenPayload, listingId: string) {
    const listing = await featuredListingRepository.findById(listingId);
    if (!listing) throw new NotFoundError("Featured listing");

    const ownerId = (listing as { providerId: { toString(): string } }).providerId.toString();
    if (ownerId !== user.userId && user.role !== "admin" && user.role !== "staff")
      throw new ForbiddenError();

    if ((listing as { status: string }).status !== "active")
      throw new UnprocessableError("Only active boosts can be cancelled.");

    await featuredListingRepository.updateStatus(listingId, "cancelled");
    return { cancelled: true };
  }

  /**
   * Get all active boosts for a provider (used by the boost page).
   */
  async getActive(userId: string) {
    return featuredListingRepository.findActiveByProvider(userId);
  }

  /**
   * Get full listing history for a provider.
   */
  async getHistory(userId: string) {
    return featuredListingRepository.findAllByProvider(userId);
  }

  /**
   * Expire all listings that are past their expiresAt. Called from cron.
   */
  async expireStale(): Promise<{ expired: number }> {
    const expired = await featuredListingRepository.expireStale();

    // Bulk notify affected providers
    const stale = await featuredListingRepository.findExpiredActive();
    if (stale.length > 0) {
      const { getNotificationT } = await import("@/services/notification.service");
      const { notificationRepository } = await import("@/repositories");
      await Promise.allSettled(
        stale.map(async (l) => {
          const providerId = (l as { providerId: { toString(): string } }).providerId.toString();
          const t = await getNotificationT(providerId);
          return notificationRepository.create({
            userId: providerId,
            type: "system",
            title: t("boostExpiredTitle"),
            message: t("boostExpiredMessage", { boostType: FEATURED_LISTING_LABELS[(l as { type: FeaturedListingType }).type] }),
            data: { listingId: (l as { _id: { toString(): string } })._id.toString() },
          });
        })
      );
    }

    return { expired };
  }
}

export const featuredListingService = new FeaturedListingService();
