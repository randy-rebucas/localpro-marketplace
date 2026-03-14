/**
 * LedgerService — Double-entry bookkeeping for LocalPro Marketplace
 *
 * Every financial event posts a matched debit + credit pair to the LedgerEntry
 * collection, creating an immutable, auditable journal.
 *
 * Chart of accounts:
 *   1000  Gateway Receivable       (Asset)     — cash held at payment processor
 *   1100  Escrow Held              (Asset)     — reserved for future use
 *   1200  Wallet Funds Held        (Asset)     — reserved for future use
 *   2000  Escrow Payable — Clients (Liability) — funded escrow awaiting release/refund
 *   2100  Earnings Payable         (Liability) — released earnings owed to providers
 *   2200  Wallet Payable — Clients (Liability) — client wallet balances
 *   2300  Withdrawal Payable       (Liability) — client withdrawal in-flight
 *   3000  Platform Equity          (Equity)    — reserved
 *   4000  Commission Revenue       (Revenue)   — platform fee recognised at release
 *   4100  Subscription Revenue     (Revenue)
 *   4200  Late Fee Revenue         (Revenue)
 *   4300  Escrow Fee Revenue       (Revenue)   — non-refundable escrow service fee, recognised at funding
 *   4400  Processing Fee Revenue   (Revenue)   — non-refundable gateway processing fee, recognised at funding
 *   4500  Withdrawal Fee Revenue   (Revenue)   — non-refundable flat fee deducted from provider payout, recognised at request time
 *   4600  Urgency Booking Fee Revenue (Revenue) — non-refundable flat fee for same-day / rush booking, recognised at escrow funding
 *   4700  Platform Service Fee Revenue (Revenue) — non-refundable client-side service fee, recognised at escrow funding
 *   4800  Featured Listing Revenue    (Revenue) — non-refundable provider boost fee, recognised at purchase
 *   4900  Lead Fee Revenue            (Revenue) — non-refundable lead / bid-credit fee, recognised at purchase
 *   4950  Cancellation Fee Revenue    (Revenue) — non-refundable fee charged when client cancels an assigned job; recognised at cancellation
 *   4960  Dispute Handling Fee Revenue (Revenue) — flat case handling fee charged to the losing party when a dispute is escalated and resolved
 *   5000  Refunds Issued           (Expense)   — reserved
 *   5100  Payment Processing Fees  (Expense)
 *   5200  Bad Debt / Write-offs    (Expense)
 *
 * Key design rules:
 *   • Revenue (4000) is recognised when escrow is RELEASED, not when funded.
 *   • 2000 tracks in-flight escrow (funded but not yet released or refunded).
 *   • 2100 tracks released earnings awaiting provider payout.
 *   • Dispute refund simply moves 2000 → 2200; no revenue reversal needed.
 */

import mongoose from "mongoose";
import { ledgerRepository } from "@/repositories/ledger.repository";
import type { JournalEntryInput } from "@/repositories/ledger.repository";
import { ACCOUNT_CODES } from "@/models/LedgerEntry";
import type { AccountCode, LedgerEntityType, LedgerEntryType } from "@/models/LedgerEntry";

export interface JournalOptions {
  journalId: string;
  entityType: LedgerEntityType;
  entityId: string;
  clientId?: string | null;
  providerId?: string | null;
  initiatedBy: string;
  currency?: string;
}

/** Convert PHP amount (float) to integer centavos */
function toCentavos(amountPHP: number): number {
  return Math.round(amountPHP * 100);
}

function toObjId(id: string | null | undefined): mongoose.Types.ObjectId | null {
  if (!id) return null;
  return new mongoose.Types.ObjectId(id);
}

function buildEntry(
  opts: JournalOptions,
  entryType: LedgerEntryType,
  debitAccount: AccountCode,
  creditAccount: AccountCode,
  amountCentavos: number,
  description: string,
  metadata: Record<string, unknown> = {}
): JournalEntryInput {
  return {
    journalId: opts.journalId,
    entryType,
    debitAccount,
    creditAccount,
    amountCentavos,
    currency: opts.currency ?? "PHP",
    entityType: opts.entityType,
    entityId: new mongoose.Types.ObjectId(opts.entityId),
    clientId:   toObjId(opts.clientId),
    providerId: toObjId(opts.providerId),
    initiatedBy: new mongoose.Types.ObjectId(opts.initiatedBy),
    description,
    reversedBy: null,
    reversalOf: null,
    metadata,
  };
}

export class LedgerService {
  /**
   * Flow 1: Client pays escrow via PayMongo checkout.
   *
   * Cash arrives; we owe back only the service amount to the client (until the job
   * is released or refunded). Both the escrow service fee and the payment processing
   * fee are non-refundable revenue recognised immediately at funding time.
   *
   * Full path (both fees present):
   *   DR 1000 Gateway Receivable      totalCharge     ← cash received
   *   CR 2000 Escrow Payable          totalCharge     ← full liability
   *   DR 2000 Escrow Payable          escrowFee       ← reduce liability by escrow fee
   *   CR 4300 Escrow Fee Revenue      escrowFee       ← non-refundable escrow revenue
   *   DR 2000 Escrow Payable          processingFee   ← reduce liability by processing fee
   *   CR 4400 Processing Fee Revenue  processingFee   ← non-refundable processing revenue
   *   DR 2000 Escrow Payable          urgencyFee         ← reduce liability by urgency fee
   *   CR 4600 Urgency Booking Fee Rev  urgencyFee         ← non-refundable urgent booking revenue
   *   DR 2000 Escrow Payable          platformServiceFee ← reduce liability by platform service fee
   *   CR 4700 Platform Service Fee    platformServiceFee ← non-refundable client-side platform fee
   *
   * Net effect on 2000: liability = serviceAmount only (escrowed for client).
   *
   * Legacy path (fees waived / zero):
   *   DR 1000 Gateway Receivable   gross  ← cash received
   *   CR 2000 Escrow Payable       gross  ← liability until release/refund
   */
  async postEscrowFundedGateway(
    opts: JournalOptions,
    grossPHP: number,
    escrowFeePHP = 0,
    processingFeePHP = 0,
    urgencyFeePHP = 0,
    platformServiceFeePHP = 0
  ): Promise<void> {
    const grossC      = toCentavos(grossPHP);
    const escrowFeeC  = toCentavos(escrowFeePHP);
    const procFeeC    = toCentavos(processingFeePHP);
    const desc        = `Escrow funded via PayMongo — Job ${opts.entityId}`;

    const entries: ReturnType<typeof buildEntry>[] = [
      buildEntry(
        opts, "escrow_funded_gateway",
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
        grossC,
        desc,
        { grossC, escrowFeeC, processingFeeC: procFeeC }
      ),
    ];

    if (escrowFeeC > 0) {
      entries.push(
        buildEntry(
          opts, "escrow_fee_accrued",
          ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
          ACCOUNT_CODES.ESCROW_FEE_REVENUE,
          escrowFeeC,
          `Escrow service fee recognised — Job ${opts.entityId}`,
          { escrowFeeC }
        )
      );
    }

    if (procFeeC > 0) {
      entries.push(
        buildEntry(
          opts, "processing_fee_accrued",
          ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
          ACCOUNT_CODES.PROCESSING_FEE_REVENUE,
          procFeeC,
          `Payment processing fee recognised — Job ${opts.entityId}`,
          { procFeeC }
        )
      );
    }

    const urgencyFeeC = toCentavos(urgencyFeePHP);
    if (urgencyFeeC > 0) {
      entries.push(
        buildEntry(
          opts, "urgency_fee_accrued",
          ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
          ACCOUNT_CODES.URGENCY_FEE_REVENUE,
          urgencyFeeC,
          `Urgent booking fee recognised — Job ${opts.entityId}`,
          { urgencyFeeC }
        )
      );
    }

    const platformServiceFeeC = toCentavos(platformServiceFeePHP);
    if (platformServiceFeeC > 0) {
      entries.push(
        buildEntry(
          opts, "platform_service_fee_accrued",
          ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
          ACCOUNT_CODES.PLATFORM_SERVICE_FEE_REVENUE,
          platformServiceFeeC,
          `Platform service fee recognised — Job ${opts.entityId}`,
          { platformServiceFeeC }
        )
      );
    }

    await ledgerRepository.postJournal(entries);
  }

  /**
   * Flow 2: Client funds escrow from their platform wallet.
   *
   * Wallet liability (2200) decreases; escrow liability (2000) increases.
   * No cash movement — 1000 Gateway Receivable stays the same.
   * Revenue NOT recognised until release.
   *
   * DR 2200 Wallet Payable   gross  ← wallet balance decreases
   * CR 2000 Escrow Payable   gross  ← escrow liability increases
   */
  async postEscrowFundedWallet(opts: JournalOptions, grossPHP: number): Promise<void> {
    const grossC = toCentavos(grossPHP);
    const desc   = `Escrow funded from wallet — Job ${opts.entityId}`;

    await ledgerRepository.postJournal([
      buildEntry(opts, "escrow_funded_wallet",
        ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
        ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
        grossC,
        desc,
        { grossC }
      ),
    ]);
  }

  /**
   * Flow 4 & 5: Job completed — client approves, escrow released to provider.
   *
   * This is the revenue recognition event. The in-flight escrow (2000) is
   * split into commission earned (4000) and provider earnings owed (2100).
   *
   * DR 2000 Escrow Payable       net         ← escrow cleared (provider's share)
   * CR 2100 Earnings Payable     net         ← owed to provider
   *
   * DR 2000 Escrow Payable       commission  ← escrow cleared (platform's share)
   * CR 4000 Commission Revenue   commission  ← platform fee recognised
   */
  async postEscrowReleased(
    opts: JournalOptions,
    grossPHP: number,
    commissionPHP: number,
    netPHP: number
  ): Promise<void> {
    const grossC      = toCentavos(grossPHP);
    const commissionC = toCentavos(commissionPHP);
    const netC        = toCentavos(netPHP);
    const desc        = `Escrow released — Job ${opts.entityId}`;

    await ledgerRepository.postJournal([
      buildEntry(opts, "escrow_released",
        ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        netC,
        `${desc} (net to provider)`,
        { grossC, commissionC, netC }
      ),
      buildEntry(opts, "commission_accrued",
        ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
        ACCOUNT_CODES.COMMISSION_REVENUE,
        commissionC,
        `${desc} (commission ${(commissionPHP / grossPHP * 100).toFixed(0)}%)`,
        { grossC, commissionC, netC }
      ),
    ]);
  }

  /**
   * Flow 9: Provider submits payout request — moves the claimed amount in-flight.
   *
   * DR 2100 Earnings Payable     amount  ← provider's earnings ring-fenced
   * CR 2400 Payout In-Flight     amount  ← in-flight liability created
   */
  async postPayoutRequested(opts: JournalOptions, amountPHP: number): Promise<void> {
    const amountC = toCentavos(amountPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "payout_requested",
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        ACCOUNT_CODES.PAYOUT_IN_FLIGHT,
        amountC,
        `Payout requested by provider — Payout ${opts.entityId}`
      ),
    ]);
  }

  /**
   * Flow 10: Admin marks provider payout as completed (bank transfer sent).
   *
   * DR 2400 Payout In-Flight     amount  ← in-flight cleared
   * CR 1000 Gateway Receivable   amount  ← cash leaves platform
   */
  async postPayoutSent(opts: JournalOptions, amountPHP: number): Promise<void> {
    const amountC = toCentavos(amountPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "payout_sent",
        ACCOUNT_CODES.PAYOUT_IN_FLIGHT,
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        amountC,
        `Payout sent to provider — Payout ${opts.entityId}`
      ),
    ]);
  }

  /**
   * Flow 10b: Admin rejects payout request — reverses the in-flight reservation.
   *
   * The withdrawal fee is non-refundable; it was recognised as revenue when the
   * payout was requested. Only the net payout amount (gross − fee) is restored
   * to Earnings Payable. This means `amountPHP` here is already the net amount.
   *
   * DR 2400 Payout In-Flight     netAmount  ← in-flight cleared (net only)
   * CR 2100 Earnings Payable     netAmount  ← net earnings restored to provider
   */
  async postPayoutRejected(opts: JournalOptions, amountPHP: number): Promise<void> {
    const amountC = toCentavos(amountPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "payout_rejected",
        ACCOUNT_CODES.PAYOUT_IN_FLIGHT,
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        amountC,
        `Payout rejected — earnings restored — Payout ${opts.entityId}`
      ),
    ]);
  }

  /**
   * Flow: Withdrawal fee accrued when a provider requests a payout.
   *
   * The fee is non-refundable — it is recognised as revenue immediately,
   * even if the payout is later rejected. We debit the Payout In-Flight
   * account so that only the net amount (gross − fee) needs to be cleared
   * when the payout is either sent or reversed.
   *
   * DR 2400 Payout In-Flight         fee  ← in-flight reduced by fee
   * CR 4500 Withdrawal Fee Revenue   fee  ← fee recognised as revenue
   */
  async postWithdrawalFeeAccrued(opts: JournalOptions, feePHP: number): Promise<void> {
    if (feePHP <= 0) return;
    const feeC = toCentavos(feePHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "withdrawal_fee_accrued",
        ACCOUNT_CODES.PAYOUT_IN_FLIGHT,
        ACCOUNT_CODES.WITHDRAWAL_FEE_REVENUE,
        feeC,
        `Withdrawal fee accrued — Payout ${opts.entityId}`
      ),
    ]);
  }

  /**
   * Flow 7: Dispute resolved in client's favour — full refund.
   *
   * The in-flight escrow simply moves back to the client's wallet.
   * No commission was ever recognised (revenue recognition deferred to release),
   * so no reversal of 4000 is needed — this is a clean single-entry journal.
   *
   * DR 2000 Escrow Payable       gross  ← escrow cleared
   * CR 2200 Wallet Payable       gross  ← refund to client wallet
   */
  async postDisputeRefund(opts: JournalOptions, grossPHP: number): Promise<void> {
    const grossC = toCentavos(grossPHP);
    const desc   = `Dispute refund — Job ${opts.entityId}`;

    await ledgerRepository.postJournal([
      buildEntry(opts, "dispute_refund_earnings",
        ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
        ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
        grossC,
        `${desc} (full escrow returned to client wallet)`,
        { grossC }
      ),
    ]);
  }

  /**
   * Flow 7b: Client cancels an assigned job — cancellation fee deducted from escrow.
   *
   * The fee is split 50/50 between provider (2100 Earnings Payable) and platform
   * (4950 Cancellation Fee Revenue). Called before posting the net refund to the client.
   *
   * DR 2000 Escrow Payable             feePHP          ← reduce escrow by total fee
   * CR 2100 Earnings Payable           providerShare   ← 50% compensation to provider
   * CR 4950 Cancellation Fee Revenue   platformShare   ← 50% platform revenue
   *
   * @param opts          - Standard journal options (must include providerId)
   * @param feePHP        - Total cancellation fee in PHP
   * @param providerShare - Provider's 50% share in PHP
   */
  async postCancellationFee(
    opts: JournalOptions,
    feePHP: number,
    providerSharePHP: number
  ): Promise<void> {
    if (feePHP <= 0) return;

    const feeC           = toCentavos(feePHP);
    const providerC      = toCentavos(providerSharePHP);
    const platformC      = feeC - providerC;
    const desc           = `Cancellation fee — Job ${opts.entityId}`;

    const entries: JournalEntryInput[] = [];

    // Provider share: DR 2000 → CR 2100
    if (providerC > 0) {
      entries.push(
        buildEntry(opts, "cancellation_fee_accrued",
          ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
          ACCOUNT_CODES.EARNINGS_PAYABLE,
          providerC,
          `${desc} — provider compensation (50%)`,
          { feePHP, providerSharePHP, split: "provider" }
        )
      );
    }

    // Platform share: DR 2000 → CR 4950
    if (platformC > 0) {
      entries.push(
        buildEntry(opts, "cancellation_fee_accrued",
          ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
          ACCOUNT_CODES.CANCELLATION_FEE_REVENUE,
          platformC,
          `${desc} — platform revenue (50%)`,
          { feePHP, platformSharePHP: feePHP - providerSharePHP, split: "platform" }
        )
      );
    }

    if (entries.length > 0) {
      await ledgerRepository.postJournal(entries);
    }
  }

  /**
   * Flow 7c: Dispute escalated + resolved — case handling fee charged to the losing party.
   *
   * Only called when the admin elected to charge `handlingFeeChargedTo`.
   * The fee is pure platform revenue (4960); no split with the provider.
   *
   * Client pays:   DR 2200 Wallet Payable — Clients  → CR 4960 Dispute Handling Fee Revenue
   * Provider pays: DR 2100 Earnings Payable           → CR 4960 Dispute Handling Fee Revenue
   *
   * @param opts    - Standard journal options (must include the relevant clientId or providerId)
   * @param feePHP  - Flat case handling fee in PHP
   * @param paidBy  - Which party's account to debit
   */
  async postDisputeHandlingFee(
    opts: JournalOptions,
    feePHP: number,
    paidBy: "client" | "provider"
  ): Promise<void> {
    if (feePHP <= 0) return;

    const feeC = toCentavos(feePHP);
    const debitAccount: AccountCode = paidBy === "client"
      ? ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS
      : ACCOUNT_CODES.EARNINGS_PAYABLE;
    const desc = `Dispute handling fee — Job ${opts.entityId} (${paidBy} charged)`;

    await ledgerRepository.postJournal([
      buildEntry(
        opts,
        "dispute_handling_fee_accrued",
        debitAccount,
        ACCOUNT_CODES.DISPUTE_HANDLING_FEE_REVENUE,
        feeC,
        desc,
        { feePHP, paidBy }
      ),
    ]);
  }

  /**
   * Flow 8: Dispute resolved in provider's favour.
   *
   * Same accounting as a normal escrow release — commission recognised,
   * provider earnings posted to 2100.
   *
   * DR 2000 Escrow Payable       net         ← escrow cleared (provider's share)
   * CR 2100 Earnings Payable     net         ← owed to provider
   *
   * DR 2000 Escrow Payable       commission  ← escrow cleared (platform's share)
   * CR 4000 Commission Revenue   commission  ← platform fee recognised
   */
  async postDisputeReleaseToProvider(
    opts: JournalOptions,
    grossPHP: number,
    commissionPHP: number,
    netPHP: number
  ): Promise<void> {
    const grossC      = toCentavos(grossPHP);
    const commissionC = toCentavos(commissionPHP);
    const netC        = toCentavos(netPHP);
    const desc        = `Dispute resolved — provider keeps earnings — Job ${opts.entityId}`;

    await ledgerRepository.postJournal([
      buildEntry(opts, "dispute_release",
        ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        netC,
        `${desc} (net to provider)`,
        { grossC, commissionC, netC }
      ),
      buildEntry(opts, "commission_accrued",
        ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
        ACCOUNT_CODES.COMMISSION_REVENUE,
        commissionC,
        `${desc} (commission recognised)`,
        { grossC, commissionC, netC }
      ),
    ]);
  }

  /**
   * Flow 11: Client wallet withdrawal requested.
   *
   * DR 2200 Wallet Payable       amount  ← wallet liability reduces
   * CR 2300 Withdrawal Payable   amount  ← in-flight withdrawal liability
   */
  async postWalletWithdrawalRequested(opts: JournalOptions, amountPHP: number): Promise<void> {
    const amountC = toCentavos(amountPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "wallet_withdrawal_requested",
        ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
        ACCOUNT_CODES.WITHDRAWAL_PAYABLE,
        amountC,
        `Wallet withdrawal requested — Withdrawal ${opts.entityId}`
      ),
    ]);
  }

  /**
   * Flow 11: Admin marks wallet withdrawal as completed.
   *
   * DR 2300 Withdrawal Payable   amount  ← in-flight cleared
   * CR 1000 Gateway Receivable   amount  ← cash leaves platform
   */
  async postWalletWithdrawalCompleted(opts: JournalOptions, amountPHP: number): Promise<void> {
    const amountC = toCentavos(amountPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "wallet_withdrawal_completed",
        ACCOUNT_CODES.WITHDRAWAL_PAYABLE,
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        amountC,
        `Wallet withdrawal completed — Withdrawal ${opts.entityId}`
      ),
    ]);
  }

  /**
   * Flow 12: Admin rejects wallet withdrawal — reversal.
   *
   * DR 2300 Withdrawal Payable   amount  ← in-flight cleared
   * CR 2200 Wallet Payable       amount  ← wallet liability restored
   */
  async postWalletWithdrawalReversed(opts: JournalOptions, amountPHP: number): Promise<void> {
    const amountC = toCentavos(amountPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "wallet_withdrawal_reversed",
        ACCOUNT_CODES.WITHDRAWAL_PAYABLE,
        ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
        amountC,
        `Wallet withdrawal reversed/rejected — Withdrawal ${opts.entityId}`
      ),
    ]);
  }

  /**
   * Client wallet top-up via PayMongo.
   *
   * DR 1000 Gateway Receivable   amount  ← cash received
   * CR 2200 Wallet Payable       amount  ← wallet balance increases
   */
  async postWalletFundedGateway(opts: JournalOptions, amountPHP: number): Promise<void> {
    const amountC = toCentavos(amountPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "wallet_funded_gateway",
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
        amountC,
        `Client wallet top-up via PayMongo — User ${opts.initiatedBy}`
      ),
    ]);
  }

  /**
   * Milestone release (partial per-milestone payout).
   *
   * Each milestone releases a portion of the in-flight escrow (2000).
   * Revenue is recognised here, same as a full release.
   *
   * DR 2000 Escrow Payable       milestoneNet        ← cleared for provider
   * CR 2100 Earnings Payable     milestoneNet        ← owed to provider
   *
   * DR 2000 Escrow Payable       milestoneCommission ← cleared for platform
   * CR 4000 Commission Revenue   milestoneCommission ← fee recognised
   */
  async postMilestoneRelease(
    opts: JournalOptions,
    milestoneGrossPHP: number,
    commissionPHP: number,
    netPHP: number
  ): Promise<void> {
    const grossC      = toCentavos(milestoneGrossPHP);
    const commissionC = toCentavos(commissionPHP);
    const netC        = toCentavos(netPHP);
    const desc        = `Milestone released — Job ${opts.entityId}`;

    await ledgerRepository.postJournal([
      buildEntry(opts, "milestone_release",
        ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        netC,
        `${desc} (net to provider)`,
        { grossC, commissionC, netC }
      ),
      buildEntry(opts, "commission_accrued",
        ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
        ACCOUNT_CODES.COMMISSION_REVENUE,
        commissionC,
        `${desc} (commission recognised)`,
        { grossC, commissionC, netC }
      ),
    ]);
  }

  /**
   * Partial release by admin — provider gets released portion, client gets refunded portion.
   *
   * Released portion (revenue recognition):
   *   DR 2000 Escrow Payable       releasedNet
   *   CR 2100 Earnings Payable     releasedNet
   *   DR 2000 Escrow Payable       releasedComm
   *   CR 4000 Commission Revenue   releasedComm
   *
   * Refunded portion (back to client wallet):
   *   DR 2000 Escrow Payable       refundedGross
   *   CR 2200 Wallet Payable       refundedGross
   *
   * Total DR 2000 = releasedGross + refundedGross = original gross ✓
   */
  async postPartialRelease(
    opts: JournalOptions,
    releasedGrossPHP: number,
    releasedCommissionPHP: number,
    releasedNetPHP: number,
    refundedGrossPHP: number
  ): Promise<void> {
    const releasedGrossC  = toCentavos(releasedGrossPHP);
    const releasedCommC   = toCentavos(releasedCommissionPHP);
    const releasedNetC    = toCentavos(releasedNetPHP);
    const refundedGrossC  = toCentavos(refundedGrossPHP);
    const desc            = `Partial release — Job ${opts.entityId}`;

    const entries: JournalEntryInput[] = [];

    // Released portion — revenue recognition
    if (releasedGrossC > 0) {
      entries.push(
        buildEntry(opts, "partial_release",
          ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
          ACCOUNT_CODES.EARNINGS_PAYABLE,
          releasedNetC,
          `${desc} (released: net to provider)`,
          { releasedGrossC, releasedCommC, releasedNetC }
        ),
        buildEntry(opts, "commission_accrued",
          ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
          ACCOUNT_CODES.COMMISSION_REVENUE,
          releasedCommC,
          `${desc} (released: commission recognised)`
        )
      );
    }

    // Refunded portion — back to client wallet
    if (refundedGrossC > 0) {
      entries.push(
        buildEntry(opts, "partial_release",
          ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
          ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
          refundedGrossC,
          `${desc} (refunded portion to client wallet)`,
          { refundedGrossC }
        )
      );
    }

    if (entries.length > 0) {
      await ledgerRepository.postJournal(entries);
    }
  }

  /**
   * Manual admin credit to a user's wallet (goodwill, compensation, etc.)
   *
   * DR 1000 Gateway Receivable   amount  ← platform absorbs cost
   * CR 2200 Wallet Payable       amount  ← wallet balance increases
   */
  async postAdminCredit(opts: JournalOptions, amountPHP: number, reason: string): Promise<void> {
    const amountC = toCentavos(amountPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "admin_credit",
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
        amountC,
        `Admin credit: ${reason} — User ${opts.clientId ?? opts.providerId}`
      ),
    ]);
  }

  /**
   * Manual admin debit from a user's wallet (correction, clawback, etc.)
   *
   * DR 2200 Wallet Payable       amount  ← wallet balance decreases
   * CR 1000 Gateway Receivable   amount  ← platform recovers cash
   */
  async postAdminDebit(opts: JournalOptions, amountPHP: number, reason: string): Promise<void> {
    const amountC = toCentavos(amountPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "admin_debit",
        ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        amountC,
        `Admin debit: ${reason} — User ${opts.clientId ?? opts.providerId}`
      ),
    ]);
  }

  /** Refresh cached account balances (called by daily reconciliation cron) */
  async refreshBalances(currency = "PHP"): Promise<void> {
    await ledgerRepository.refreshAccountBalances(currency);
  }

  /** Get the trial balance (all accounts) */
  async getTrialBalance(currency = "PHP") {
    return ledgerRepository.getTrialBalance(currency);
  }

  /** Get income statement for a date range */
  async getIncomeStatement(from: Date, to: Date, currency = "PHP") {
    return ledgerRepository.getIncomeStatement(from, to, currency);
  }

  /**
   * Reconciliation: verify that 2100 Earnings Payable matches
   * sum of completed transaction nets minus ALL ring-fenced payouts
   * (pending + processing + completed; excludes rejected which return to 2100).
   */
  async reconcileEarningsPayable(currency = "PHP"): Promise<{
    balanced: boolean;
    ledgerBalance: number;
    transactionBalance: number;
    diff: number;
  }> {
    const { transactionRepository } = await import("@/repositories/transaction.repository");
    const { payoutRepository }      = await import("@/repositories/payout.repository");

    const ledgerBalance = await ledgerRepository.computeAccountBalance("2100", currency);

    const [txSums, payoutNetRequested] = await Promise.all([
      transactionRepository.getAdminTotals(),
      payoutRepository.sumAllNetRequested(),
    ]);

    // 2100 is credited for every released net; debited when payouts are ring-fenced.
    // Pending + processing payouts have already been DR'd from 2100 into 2400,
    // so they must be subtracted alongside completed payouts.
    const netToProviders = txSums.gmv - txSums.commission;
    const transactionBalance = toCentavos(netToProviders - payoutNetRequested);
    const diff = ledgerBalance - transactionBalance;

    return {
      balanced: diff === 0,
      ledgerBalance,
      transactionBalance,
      diff,
    };
  }
  /**
   * Flow: Provider pays for a featured listing boost from their wallet.
   *
   * Provider wallet liability decreases; platform earns non-refundable revenue.
   *
   *   DR 2200 Wallet Payable — Clients   amountPHP  ← provider wallet debited
   *   CR 4800 Featured Listing Revenue   amountPHP  ← revenue recognised immediately
   */
  async postFeaturedListingPayment(
    opts: JournalOptions,
    amountPHP: number
  ): Promise<void> {
    const amountC = toCentavos(amountPHP);
    await ledgerRepository.postJournal([
      buildEntry(
        opts,
        "featured_listing_payment",
        ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
        ACCOUNT_CODES.FEATURED_LISTING_REVENUE,
        amountC,
        `Featured listing boost payment — ${opts.entityId}`,
        { amountC }
      ),
    ]);
  }

  /**
   * Lead fee payment (pay-per-lead, bid credit purchase, or subscription).
   *   DR 2200 Wallet Payable — Clients   amountPHP  ← provider wallet debited
   *   CR 4900 Lead Fee Revenue           amountPHP  ← revenue recognised immediately
   */
  async postLeadFeePayment(
    opts: JournalOptions,
    amountPHP: number,
    mode: "pay_per_lead" | "bid_credit_purchase" | "lead_subscription"
  ): Promise<void> {
    const amountC = toCentavos(amountPHP);
    const entryType =
      mode === "lead_subscription"   ? "lead_subscription_payment" :
      mode === "bid_credit_purchase" ? "bid_credit_purchase"       :
      "lead_fee_payment";
    await ledgerRepository.postJournal([
      buildEntry(
        opts,
        entryType,
        ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
        ACCOUNT_CODES.LEAD_FEE_REVENUE,
        amountC,
        `Lead fee — ${mode} — ${opts.entityId}`,
        { amountC, mode }
      ),
    ]);
  }

  /**
   * Flow – Training / Upskilling Course Payment.
   *
   * Wallet path (provider's LocalPro wallet):
   *   DR 2200 Wallet Payable — Clients    amountPHP  ← provider wallet debited
   *   CR 4970 Training Course Revenue     amountPHP  ← revenue recognised
   *
   * Gateway path (PayMongo checkout):
   *   DR 1000 Gateway Receivable          amountPHP  ← cash received from gateway
   *   CR 4970 Training Course Revenue     amountPHP  ← revenue recognised
   */
  async postTrainingCoursePayment(
    opts: JournalOptions,
    amountPHP: number,
    via: "wallet" | "gateway"
  ): Promise<void> {
    if (amountPHP <= 0) return;
    const amountC = toCentavos(amountPHP);
    const debitAccount =
      via === "wallet"
        ? ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS
        : ACCOUNT_CODES.GATEWAY_RECEIVABLE;
    await ledgerRepository.postJournal([
      buildEntry(
        opts,
        "training_course_payment",
        debitAccount,
        ACCOUNT_CODES.TRAINING_COURSE_REVENUE,
        amountC,
        `Training course payment (${via}) — Enrollment ${opts.entityId}`,
        { amountC, via }
      ),
    ]);
  }

}

export const ledgerService = new LedgerService();
