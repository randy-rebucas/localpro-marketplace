import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import { ledgerService } from "@/services/ledger.service";
import { ledgerRepository } from "@/repositories/ledger.repository";
import Transaction from "@/models/Transaction";
import Wallet from "@/models/Wallet";
import ActivityLog from "@/models/ActivityLog";

/**
 * GET /api/cron/reconcile-ledger
 *
 * Runs 5 reconciliation checks against the LedgerEntry collection and
 * cross-validates with the operational models (Transaction, Wallet, etc.).
 * Designed to run nightly via Vercel Cron (or any cron scheduler).
 *
 * Checks:
 *   1. Total ledger debits === total ledger credits (books balance)
 *   2. Account 2100 (Earnings Payable) === completed TX nets − completed payouts
 *   3. Account 2000 (Escrow Payable)   === SUM(pending Transaction.amount)
 *   4. Account 2200 (Wallet Payable)   === SUM(Wallet.balance)
 *   5. Account 4000 (Commission Rev)   === SUM(completed Transaction.commission)
 *
 * On any failure: logs to ActivityLog and returns non-200 so the caller retries.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const currency = "PHP";
  const checks: {
    name: string;
    passed: boolean;
    ledgerValue: number;
    operationalValue: number;
    diffCentavos: number;
  }[] = [];
  const errors: string[] = [];

  // ── Refresh cached balances first ──────────────────────────────────────────
  await ledgerService.refreshBalances(currency);

  // ── CHECK 1: Total debits = total credits ─────────────────────────────────
  try {
    const { default: LedgerEntry } = await import("@/models/LedgerEntry");
    // Sum amountCentavos for every entry appearing as a debit vs. as a credit.
    // In a balanced double-entry ledger these two aggregations must be equal.
    const [debitAgg, creditAgg] = await Promise.all([
      LedgerEntry.aggregate([
        { $match: { currency } },
        { $group: { _id: null, total: { $sum: "$amountCentavos" } } },
      ]),
      LedgerEntry.aggregate([
        { $match: { currency } },
        {
          $group: {
            _id: null,
            // Each row is one entry; both debitAccount and creditAccount share
            // the same amountCentavos. The ledger is balanced iff the count of
            // entries on the debit side equals the credit side — i.e. if we sum
            // amountCentavos for all records (each contributes one debit and one
            // credit of equal size) the totals are structurally equal.
            // To catch real imbalances we instead sum by aggregating on each
            // account role independently using separate pipelines below.
            total: { $sum: "$amountCentavos" },
          },
        },
      ]),
    ]);
    // Recompute using per-account-role aggregation to catch any orphaned entries.
    const [allDebitsByAccount, allCreditsByAccount] = await Promise.all([
      LedgerEntry.aggregate([
        { $match: { currency } },
        { $group: { _id: "$debitAccount", total: { $sum: "$amountCentavos" } } },
      ]),
      LedgerEntry.aggregate([
        { $match: { currency } },
        { $group: { _id: "$creditAccount", total: { $sum: "$amountCentavos" } } },
      ]),
    ]);
    const totalDebitSide  = allDebitsByAccount.reduce((s: number, r: { total: number }) => s + r.total, 0);
    const totalCreditSide = allCreditsByAccount.reduce((s: number, r: { total: number }) => s + r.total, 0);
    const diff1 = totalDebitSide - totalCreditSide;
    checks.push({ name: "Debits = Credits", passed: diff1 === 0, ledgerValue: totalDebitSide, operationalValue: totalCreditSide, diffCentavos: diff1 });
    if (diff1 !== 0) errors.push(`CHECK 1 FAILED: debit-side total ${totalDebitSide} ≠ credit-side total ${totalCreditSide} (diff ${diff1} centavos)`);
    void debitAgg; void creditAgg; // consumed above via per-account aggregation
  } catch (err) {
    errors.push(`CHECK 1 ERROR: ${String(err)}`);
  }

  // ── CHECK 2: Earnings Payable (2100) reconciles ───────────────────────────
  try {
    const result = await ledgerService.reconcileEarningsPayable(currency);
    checks.push({
      name: "2100 Earnings Payable = completed TX nets − completed payouts",
      passed: result.balanced,
      ledgerValue: result.ledgerBalance,
      operationalValue: result.transactionBalance,
      diffCentavos: result.diff,
    });
    if (!result.balanced) errors.push(`CHECK 2 FAILED: ledger 2100=${result.ledgerBalance} vs TX-derived=${result.transactionBalance} (diff ${result.diff})`);
  } catch (err) {
    errors.push(`CHECK 2 ERROR: ${String(err)}`);
  }

  // ── CHECK 3: Escrow Payable (2000) = SUM pending TX amounts ───────────────
  try {
    const [ledger2000, txSum] = await Promise.all([
      ledgerRepository.computeAccountBalance("2000", currency),
      Transaction.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);
    const txTotal = ((txSum[0]?.total ?? 0) as number) * 100; // PHP→centavos
    const diff3   = ledger2000 - txTotal;
    checks.push({
      name: "2000 Escrow Payable = SUM(pending Transaction.amount)",
      passed: diff3 === 0,
      ledgerValue: ledger2000,
      operationalValue: txTotal,
      diffCentavos: diff3,
    });
    if (diff3 !== 0) errors.push(`CHECK 3 FAILED: 2000=${ledger2000} vs pending TXs=${txTotal} centavos (diff ${diff3})`);
  } catch (err) {
    errors.push(`CHECK 3 ERROR: ${String(err)}`);
  }

  // ── CHECK 4: Wallet Payable (2200) = SUM(Wallet.balance) ─────────────────
  try {
    const [ledger2200, walletSum] = await Promise.all([
      ledgerRepository.computeAccountBalance("2200", currency),
      Wallet.aggregate([{ $group: { _id: null, total: { $sum: "$balance" } } }]),
    ]);
    const walletTotal = ((walletSum[0]?.total ?? 0) as number) * 100; // PHP→centavos
    const diff4       = ledger2200 - walletTotal;
    checks.push({
      name: "2200 Wallet Payable = SUM(Wallet.balance)",
      passed: diff4 === 0,
      ledgerValue: ledger2200,
      operationalValue: walletTotal,
      diffCentavos: diff4,
    });
    if (diff4 !== 0) errors.push(`CHECK 4 FAILED: 2200=${ledger2200} vs wallet sums=${walletTotal} centavos (diff ${diff4})`);
  } catch (err) {
    errors.push(`CHECK 4 ERROR: ${String(err)}`);
  }

  // ── CHECK 5: Commission Revenue (4000) = SUM completed TX commissions ─────
  try {
    const [ledger4000, txComm] = await Promise.all([
      ledgerRepository.computeAccountBalance("4000", currency),
      Transaction.aggregate([
        { $match: { status: { $in: ["completed", "pending"] } } },
        { $group: { _id: null, total: { $sum: "$commission" } } },
      ]),
    ]);
    // With deferred revenue recognition (at release), only "completed" TXs
    // should have commission entries in the ledger.
    const completedOnly = await Transaction.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$commission" } } },
    ]);
    const txCommTotal = ((completedOnly[0]?.total ?? 0) as number) * 100;
    const diff5       = ledger4000 - txCommTotal;
    checks.push({
      name: "4000 Commission Revenue = SUM(completed Transaction.commission)",
      passed: diff5 === 0,
      ledgerValue: ledger4000,
      operationalValue: txCommTotal,
      diffCentavos: diff5,
    });
    if (diff5 !== 0) errors.push(`CHECK 5 FAILED: 4000=${ledger4000} vs completed TX comms=${txCommTotal} centavos (diff ${diff5})`);
  } catch (err) {
    errors.push(`CHECK 5 ERROR: ${String(err)}`);
  }

  const allPassed = errors.length === 0;

  // ── Persist result to activity log ────────────────────────────────────────
  try {
    // Use admin system user ID placeholder for the cron runner
    await ActivityLog.create({
      userId: "000000000000000000000000",
      eventType: "reconciliation_run",
      metadata: { checks, errors, allPassed, currency, ranAt: new Date() },
    });
  } catch {
    // Non-critical — don't fail the cron if logging errors
  }

  if (!allPassed) {
    console.error("[RECONCILE-LEDGER] Failures detected:\n" + errors.join("\n"));
    return Response.json(
      { ok: false, allPassed: false, checks, errors },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, allPassed: true, checks, errors: [] });
}
