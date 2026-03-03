import { loyaltyRepository } from "@/repositories/loyalty.repository";
import LoyaltyBadge from "@/components/shared/LoyaltyBadge";
import { formatCurrency } from "@/lib/utils";
import { getClientTier } from "@/lib/loyalty";
import Link from "next/link";
import { Gift } from "lucide-react";

export async function LoyaltyWidget({ userId }: { userId: string }) {
  const account = await loyaltyRepository.findByUserId(userId);
  if (!account) return null;

  const tierInfo = getClientTier(account.lifetimePoints);

  return (
    <Link
      href="/client/rewards"
      className="flex items-center justify-between gap-4 bg-gradient-to-r from-primary/5 to-blue-50 border border-primary/20 rounded-xl px-5 py-3.5 hover:border-primary/40 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-primary/10 rounded-lg text-primary flex-shrink-0">
          <Gift className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">
              {account.points.toLocaleString()} pts
            </span>
            <LoyaltyBadge tier={account.tier} size="sm" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 bg-slate-200 rounded-full h-1.5 max-w-[120px]">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${tierInfo.progress}%` }}
              />
            </div>
            {tierInfo.next && (
              <span className="text-xs text-slate-400">
                {tierInfo.pointsToNext} pts to {tierInfo.next}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {account.credits > 0 && (
          <p className="text-xs font-semibold text-green-600">{formatCurrency(account.credits)} credit</p>
        )}
        <p className="text-xs text-primary/70 group-hover:text-primary transition-colors">View Rewards →</p>
      </div>
    </Link>
  );
}
