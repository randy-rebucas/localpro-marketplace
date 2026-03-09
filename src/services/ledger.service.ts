/**
 * LedgerService — Double-entry bookkeeping for LocalPro Marketplace
 *
 * Every financial event posts a matched debit + credit pair to the LedgerEntry
 * collection, creating an immutable, auditable journal.
 *
 * Chart of accounts:
 *   1000  Gateway Receivable       (Asset)
 *   1100  Escrow Held              (Asset)
 *   1200  Wallet Funds Held        (Asset)
 *   2000  Escrow Payable — Clients (Liability)
 *   2100  Earnings Payable         (Liability)
 *   2200  Wallet Payable — Clients (Liability)
 *   2300  Withdrawal Payable       (Liability)
 *   4000  Commission Revenue       (Revenue)
 *   5000  Refunds Issued           (Expense)
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
   * Flow 1 & 3: Client pays escrow via PayMongo checkout.
   *
   * DR 1000 Gateway Receivable     gross   ← money received
   * CR 4000 Commission Revenue     commission ← platform earns fee
   * CR 2100 Earnings Payable       net     ← owed to provider
   */
  async postEscrowFundedGateway(
    opts: JournalOptions,
    grossPHP: number,
    commissionPHP: number,
    netPHP: number
  ): Promise<void> {
    const grossC      = toCentavos(grossPHP);
    const commissionC = toCentavos(commissionPHP);
    const netC        = toCentavos(netPHP);
    const desc        = `Escrow funded via PayMongo — Job ${opts.entityId}`;

    await ledgerRepository.postJournal([
      buildEntry(opts, "escrow_funded_gateway",
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        netC,
        `${desc} (net to provider)`
      ),
      buildEntry(opts, "commission_accrued",
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        ACCOUNT_CODES.COMMISSION_REVENUE,
        commissionC,
        `${desc} (commission ${(commissionPHP / grossPHP * 100).toFixed(0)}%)`,
        { grossC, commissionC, netC }
      ),
    ]);
  }

  /**
   * Flow 2: Client funds escrow from their wallet balance.
   *
   * DR 2200 Wallet Payable         gross   ← client wallet liability decreases
   * CR 2100 Earnings Payable       net     ← owed to provider
   * CR 4000 Commission Revenue     commission ← platform fee
   */
  async postEscrowFundedWallet(
    opts: JournalOptions,
    grossPHP: number,
    commissionPHP: number,
    netPHP: number
  ): Promise<void> {
    const grossC      = toCentavos(grossPHP);
    const commissionC = toCentavos(commissionPHP);
    const netC        = toCentavos(netPHP);
    const desc        = `Escrow funded from wallet — Job ${opts.entityId}`;

    await ledgerRepository.postJournal([
      buildEntry(opts, "escrow_funded_wallet",
        ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        netC,
        `${desc} (net to provider)`
      ),
      buildEntry(opts, "commission_accrued",
        ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
        ACCOUNT_CODES.COMMISSION_REVENUE,
        commissionC,
        `${desc} (commission)`,
        { grossC, commissionC, netC }
      ),
    ]);
  }

  /**
   * Flow 4 & 5: Job completed — escrow released to provider.
   * Commission was already recognized at funding. No new revenue entry needed.
   *
   * (No new ledger entries — earnings already in 2100 Earnings Payable)
   * We record a zero-amount marker for audit trail only.
   */
  async postEscrowReleased(opts: JournalOptions, netPHP: number): Promise<void> {
    const netC = toCentavos(netPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "escrow_released",
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        netC,
        `Escrow released — Job ${opts.entityId} (provider earnings confirmed, awaiting payout)`,
        { status: "released" }
      ),
    ]);
  }

  /**
   * Flow 9 & 10: Admin marks provider payout as completed (bank transfer sent).
   *
   * DR 2100 Earnings Payable       amount  ← liability settled
   * CR 1000 Gateway Receivable     amount  ← cash leaves platform
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
   * Flow 7: Dispute resolved — full refund to client.
   *
   * DR 4000 Commission Revenue     commission ← reverse earned commission
   * CR 5000 Refunds Issued         commission ← expense recognised
   *
   * DR 2100 Earnings Payable       net     ← reverse provider earnings
   * CR 2200 Wallet Payable         gross   ← credit full amount to client wallet
   */
  async postDisputeRefund(
    opts: JournalOptions,
    grossPHP: number,
    commissionPHP: number,
    netPHP: number
  ): Promise<void> {
    const grossC      = toCentavos(grossPHP);
    const commissionC = toCentavos(commissionPHP);
    const netC        = toCentavos(netPHP);
    const desc        = `Dispute refund — Job ${opts.entityId}`;

    await ledgerRepository.postJournal([
      // Reverse commission
      buildEntry(opts, "dispute_refund_commission",
        ACCOUNT_CODES.COMMISSION_REVENUE,
        ACCOUNT_CODES.REFUNDS_ISSUED,
        commissionC,
        `${desc} (commission reversed)`,
        { grossC, commissionC, netC }
      ),
      // Reverse provider earnings + credit full amount to client wallet
      buildEntry(opts, "dispute_refund_earnings",
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
        netC,
        `${desc} (provider earnings reversed, credited to client wallet)`
      ),
      // Credit commission portion to client wallet too
      buildEntry(opts, "dispute_refund_commission",
        ACCOUNT_CODES.REFUNDS_ISSUED,
        ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
        commissionC,
        `${desc} (commission portion returned to client wallet)`
      ),
    ]);
  }

  /**
   * Flow 8: Dispute resolved in provider's favour — no financial change needed.
   * Earnings were already in 2100. Post audit marker only.
   */
  async postDisputeReleaseToProvider(opts: JournalOptions, netPHP: number): Promise<void> {
    const netC = toCentavos(netPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "dispute_release",
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        netC,
        `Dispute resolved — provider keeps earnings — Job ${opts.entityId}`
      ),
    ]);
  }

  /**
   * Flow 11: Client wallet withdrawal requested.
   *
   * DR 2200 Wallet Payable         amount  ← liability reduces
   * CR 2300 Withdrawal Payable     amount  ← in-flight withdrawal liability
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
   * DR 2300 Withdrawal Payable     amount  ← in-flight cleared
   * CR 1200 Wallet Funds Held      amount  ← asset reduces (cash out)
   */
  async postWalletWithdrawalCompleted(opts: JournalOptions, amountPHP: number): Promise<void> {
    const amountC = toCentavos(amountPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "wallet_withdrawal_completed",
        ACCOUNT_CODES.WITHDRAWAL_PAYABLE,
        ACCOUNT_CODES.WALLET_FUNDS_HELD,
        amountC,
        `Wallet withdrawal completed — Withdrawal ${opts.entityId}`
      ),
    ]);
  }

  /**
   * Flow 12: Admin rejects wallet withdrawal — reversal.
   *
   * DR 2300 Withdrawal Payable     amount  ← in-flight cleared
   * CR 2200 Wallet Payable         amount  ← liability restored
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
   * Client wallet top-up via PayMongo (future flow).
   *
   * DR 1000 Gateway Receivable     amount
   * CR 2200 Wallet Payable         amount
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
   * Same accounting as full escrow release but limited to milestone amount.
   */
  async postMilestoneRelease(opts: JournalOptions, milestonePHP: number, commissionPHP: number, netPHP: number): Promise<void> {
    const milestoneC  = toCentavos(milestonePHP);
    const commissionC = toCentavos(commissionPHP);
    const netC        = toCentavos(netPHP);

    await ledgerRepository.postJournal([
      buildEntry(opts, "milestone_release",
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        netC,
        `Milestone released — Job ${opts.entityId} (net to provider)`
      ),
      buildEntry(opts, "commission_accrued",
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        ACCOUNT_CODES.COMMISSION_REVENUE,
        commissionC,
        `Milestone commission — Job ${opts.entityId}`,
        { milestoneC, commissionC, netC }
      ),
    ]);
  }

  /**
   * Partial release by admin.
   */
  async postPartialRelease(
    opts: JournalOptions,
    releasedPHP: number,
    refundedPHP: number,
    commissionPHP: number,
    netPHP: number
  ): Promise<void> {
    const releasedC   = toCentavos(releasedPHP);
    const refundedC   = toCentavos(refundedPHP);
    const commissionC = toCentavos(commissionPHP);
    const netC        = toCentavos(netPHP);

    const entries: JournalEntryInput[] = [
      buildEntry(opts, "partial_release",
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        ACCOUNT_CODES.EARNINGS_PAYABLE,
        netC,
        `Partial release (${releasedPHP} released) — Job ${opts.entityId}`
      ),
      buildEntry(opts, "commission_accrued",
        ACCOUNT_CODES.GATEWAY_RECEIVABLE,
        ACCOUNT_CODES.COMMISSION_REVENUE,
        commissionC,
        `Partial release commission — Job ${opts.entityId}`,
        { releasedC, commissionC, netC }
      ),
    ];

    // Refund remainder to client wallet
    if (refundedC > 0) {
      entries.push(
        buildEntry(opts, "dispute_refund_earnings",
          ACCOUNT_CODES.GATEWAY_RECEIVABLE,
          ACCOUNT_CODES.WALLET_PAYABLE_CLIENTS,
          refundedC,
          `Partial release remainder refunded to client — Job ${opts.entityId}`
        )
      );
    }

    await ledgerRepository.postJournal(entries);
  }

  /**
   * Manual admin credit to a user's wallet (goodwill, compensation, etc.)
   *
   * DR 1000 Gateway Receivable     amount
   * CR 2200 Wallet Payable         amount
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
   * DR 2200 Wallet Payable         amount
   * CR 1000 Gateway Receivable     amount
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
   * Reconciliation helper: verify that provider earnings payable matches
   * sum of completed transactions minus completed payouts.
   * Returns true if balanced, false + diff if not.
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
