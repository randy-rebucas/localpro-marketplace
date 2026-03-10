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
   * Cash arrives; we owe it back to the client until the job is released or refunded.
   * Revenue is NOT recognised here — only when escrow is released (Flow 4).
   *
   * DR 1000 Gateway Receivable   gross  ← cash received
   * CR 2000 Escrow Payable       gross  ← liability until release/refund
   */
  async postEscrowFundedGateway(opts: JournalOptions, grossPHP: number): Promise<void> {
    const grossC = toCentavos(grossPHP);
    const desc   = `Escrow funded via PayMongo — Job ${opts.entityId}`;

    await ledgerRepository.postJournal([
      buildEntry(opts, "escrow_funded_gateway",
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        ACCOUNT_CODES.ESCROW_PAYABLE_CLIENTS,
        grossC,
        desc,
        { grossC }
      ),
    ]);
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
   * Flow 9 & 10: Admin marks provider payout as completed (bank transfer sent).
   *
   * DR 2100 Earnings Payable     amount  ← liability settled
   * CR 1000 Gateway Receivable   amount  ← cash leaves platform
   */
  async postPayoutSent(opts: JournalOptions, amountPHP: number): Promise<void> {
    const amountC = toCentavos(amountPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "payout_sent",
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        amountC,
        `Payout sent to provider — Payout ${opts.entityId}`
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
        buildEntry(opts, "dispute_refund_earnings",
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
   * sum of completed transaction nets minus completed payouts.
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

    const [txSums, payoutSums] = await Promise.all([
      transactionRepository.getAdminTotals(),
      payoutRepository.sumAllCompleted(),
    ]);

    // Only completed transactions have had their escrow released → 2100 credited
    const netToProviders = txSums.gmv - txSums.commission;
    const transactionBalance = toCentavos(netToProviders - (payoutSums ?? 0));
    const diff = ledgerBalance - transactionBalance;

    return {
      balanced: diff === 0,
      ledgerBalance,
      transactionBalance,
      diff,
    };
  }
}

export const ledgerService = new LedgerService();
