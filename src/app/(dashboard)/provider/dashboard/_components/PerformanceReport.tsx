import {
  MARKETPLACE_TIER_NOTE,
  buildProviderPerformanceReport,
  loadProviderPerformanceReportInput,
} from "@/lib/provider-performance-report";
import { ClipboardList, Sparkles, TrendingUp, MessageSquareQuote } from "lucide-react";

function formatRelativeDay(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diffMs = Date.now() - t;
  const days = Math.floor(diffMs / (86_400_000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} wk ago`;
  return `${Math.floor(days / 30)} mo ago`;
}

export async function PerformanceReport({ userId }: { userId: string }) {
  const input = await loadProviderPerformanceReportInput(userId);
  const report = buildProviderPerformanceReport(input);
  const { metrics, tier, recommendations, summaryOneLiner } = report;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 bg-slate-50/80">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Performance report</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Marketplace tiers: Bronze → Silver → Gold → Elite Pro (based on jobs, rating, completion).
            </p>
            <p className="text-xs text-slate-600 mt-2 leading-snug">{summaryOneLiner}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-lg leading-none" aria-hidden>
            {tier.emoji}
          </span>
          <span className="text-sm font-semibold text-slate-800">{tier.label}</span>
        </div>
      </div>

      <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCell label="Overall rating" value={metrics.reviewCount > 0 ? `${metrics.avgRating.toFixed(1)}★` : "—"} sub={`${metrics.reviewCount} review${metrics.reviewCount === 1 ? "" : "s"}`} />
        <MetricCell
          label="Punctuality (reviews)"
          value={metrics.punctualityAverage != null ? `${metrics.punctualityAverage.toFixed(1)} / 5` : "—"}
          sub={
            metrics.punctualityAverage != null
              ? `${metrics.dimensionalBreakdown.breakdownReviewCount} review${metrics.dimensionalBreakdown.breakdownReviewCount === 1 ? "" : "s"} with breakdown`
              : metrics.punctualityNote ?? "Dimensional averages pending"
          }
        />
        <MetricCell label="Completion rate" value={`${metrics.completionRate}%`} sub={`${metrics.completedJobCount} jobs`} />
        <MetricCell
          label="Responsiveness"
          value={metrics.avgResponseTimeHours > 0 ? `${metrics.avgResponseTimeHours < 24 ? metrics.avgResponseTimeHours.toFixed(1) + "h" : Math.round(metrics.avgResponseTimeHours / 24) + "d"} avg reply` : "—"}
          sub={metrics.responsivenessNote ?? "Quote response time"}
        />
      </div>

      <div className="px-5 pb-4 grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Recommendations
          </p>
          <ul className="space-y-2">
            {recommendations.length === 0 ? (
              <li className="text-xs text-slate-500">No automated tips right now — keep up the great work.</li>
            ) : (
              recommendations.map((rec) => (
                <li
                  key={`${rec.type}-${rec.title}`}
                  className={`text-xs rounded-lg px-3 py-2 border ${
                    rec.type === "recognition"
                      ? "border-violet-100 bg-violet-50/80 text-violet-900"
                      : "border-amber-100 bg-amber-50/70 text-amber-950"
                  }`}
                >
                  <span className="font-semibold flex items-center gap-1">
                    {rec.type === "recognition" ? (
                      <Sparkles className="h-3 w-3 shrink-0 opacity-80" />
                    ) : null}
                    {rec.title}
                  </span>
                  <span className="block mt-0.5 opacity-90">{rec.detail}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <MessageSquareQuote className="h-3.5 w-3.5" />
            Recent feedback
          </p>
          {input.recentFeedback.length === 0 ? (
            <p className="text-xs text-slate-500">No public reviews yet.</p>
          ) : (
            <ul className="space-y-2">
              {input.recentFeedback.map((fb, i) => (
                <li key={`${fb.createdAtIso}-${i}`} className="text-xs text-slate-700 border border-slate-100 rounded-lg px-3 py-2 bg-slate-50/60">
                  <div className="flex justify-between gap-2 text-[11px] text-slate-400 mb-1">
                    <span>{fb.rating}★</span>
                    <span>{formatRelativeDay(fb.createdAtIso)}</span>
                  </div>
                  <p className="leading-snug">{fb.excerpt || "—"}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="px-5 pb-4 text-[11px] text-slate-400 leading-snug">{MARKETPLACE_TIER_NOTE}</p>
    </section>
  );
}

function MetricCell({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-0.5">{value}</p>
      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{sub}</p>
    </div>
  );
}
