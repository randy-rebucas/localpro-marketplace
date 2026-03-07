import { reviewRepository } from "@/repositories/review.repository";
import { userRepository } from "@/repositories/user.repository";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import Link from "next/link";
import { CalendarDays, Trophy, Zap } from "lucide-react";

export async function DashboardHeader({ userId }: { userId: string }) {
  const [ratingSummary, streak, userDoc, profileDoc] = await Promise.all([
    reviewRepository.getProviderRatingSummary(userId),
    reviewRepository.getFiveStarStreak(userId),
    userRepository.findById(userId) as Promise<{ name?: string } | null>,
    providerProfileRepository.findByUserId(userId) as Promise<{
      completionRate?: number;
      completedJobCount?: number;
      avgResponseTimeHours?: number;
    } | null>,
  ]);

  const firstName = userDoc?.name?.split(" ")[0] ?? "there";
  const { avgRating } = ratingSummary;
  const completionRate = profileDoc?.completionRate ?? 100;
  const completedJobCount = profileDoc?.completedJobCount ?? 0;
  const avgResponseTimeHours = profileDoc?.avgResponseTimeHours ?? 0;

  const isTopPro = completedJobCount >= 50 && avgRating >= 4.5 && completionRate >= 90;

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-0.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {dateLabel}
        </p>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Welcome back, <span className="text-primary">{firstName}</span>!
          </h1>
          {isTopPro && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <Trophy className="h-3 w-3" /> Top Pro
            </span>
          )}
          {streak >= 3 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
              🔥 {streak}-Star Streak
            </span>
          )}
          {avgResponseTimeHours > 0 && avgResponseTimeHours <= 2 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              <Zap className="h-3 w-3" /> Fast Responder
            </span>
          )}
        </div>
        <p className="hidden sm:block text-sm text-slate-500 mt-0.5">Here&apos;s your performance overview.</p>
      </div>
      <Link href="/provider/marketplace" className="btn-primary flex-shrink-0">
        Browse Jobs
      </Link>
    </div>
  );
}
