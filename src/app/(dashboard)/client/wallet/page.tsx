import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { walletService } from "@/services/wallet.service";
import { formatCurrency } from "@/lib/utils";
import {
  Wallet, Clock, CheckCircle, XCircle,
  PlusCircle, BadgeCheck, AlertTriangle, BookOpen,
} from "lucide-react";
import WalletWithdrawForm from "./_components/WalletWithdrawForm";
import WalletTopUpForm from "./_components/WalletTopUpForm";
import WalletTopUpConfirm from "./_components/WalletTopUpConfirm";
import WalletLedgerTable from "./_components/WalletLedgerTable";
import WalletWithdrawalList from "./_components/WalletWithdrawalList";
import type { IWalletWithdrawal } from "@/types";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: "Wallet" };
}


export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ topup?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("clientPages");

  const { topup: topupStatus } = await searchParams;

  const { balance, pendingWithdrawals, availableBalance, withdrawals } =
    await walletService.getWallet(user.userId);

  const serialisedWithdrawals = JSON.parse(JSON.stringify(withdrawals)) as IWalletWithdrawal[];
  const unaccountedWithdrawals = serialisedWithdrawals.filter((w) => !w.ledgerJournalId).length;

  return (
    <div className="space-y-8">

      {/* ── Invisible client component: reads sessionStorage, calls verify, refreshes ── */}
      {topupStatus === "success" && <WalletTopUpConfirm />}

      {/* ── Page header ──────────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("wallet")}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {t("walletSub")}
        </p>
      </div>

      {/* ── Contextual status banners ─────────────────────────────────────────────────── */}
      {topupStatus === "success" && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-emerald-800">
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">{t("topupSuccess")}</p>
            <p className="text-xs text-emerald-600">{t("topupSuccessSub")}</p>
          </div>
        </div>
      )}
      {topupStatus === "cancelled" && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 text-amber-800">
          <XCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm">{t("topupCancelled")}</p>
        </div>
      )}

      {/* ── 1. Balance overview ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100">
            <Wallet className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{t("totalBalance")}</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(balance)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{t("available")}</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(availableBalance)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{t("pendingWithdrawals")}</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(pendingWithdrawals)}</p>
          </div>
        </div>
      </div>

      {/* ── 2 & 3. Two-column: ledger (left) + actions (right) ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6">
          {/* ── LEFT: Transaction ledger ──────────────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800">{t("transactionLedger")}</h2>
            </div>
            <WalletLedgerTable />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {serialisedWithdrawals.length > 0 && (
              <>
                <div className="mt-4 px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t("requests")}</p>
                  {unaccountedWithdrawals > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {t("missingLedger", { count: unaccountedWithdrawals })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 font-medium">
                      <BadgeCheck className="h-3 w-3" />
                      {t("allAccounted")}
                    </span>
                  )}
                </div>
                <WalletWithdrawalList withdrawals={serialisedWithdrawals} />
              </>
            )}
          </div>
        </div>
        {/* ── RIGHT: Top up + Withdraw ──────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Top Up */}
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100">
                <PlusCircle className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">{t("topUpWallet")}</h2>
                <p className="text-xs text-slate-500">{t("topUpSub")}</p>
              </div>
            </div>
            <WalletTopUpForm currentBalance={balance} />
          </div>

          {/* Withdraw + pending requests */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">{t("withdrawToBank")}</h2>
                <p className="text-sm text-slate-500 mt-1">{t("withdrawSub")}</p>
              </div>
              <WalletWithdrawForm available={availableBalance} />
            </div>


          </div>

        </div>
      </div>

    </div>
  );
}
