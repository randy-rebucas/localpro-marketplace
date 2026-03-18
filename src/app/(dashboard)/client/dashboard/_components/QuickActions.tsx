import Link from "next/link";
import { PlusCircle, FileSearch, MessageSquare, Star, CreditCard } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function QuickActions() {
  const t = await getTranslations("clientPages");

  const ACTIONS = [
    { href: "/client/post-job", icon: PlusCircle, label: t("dash_actionPostJob"), description: t("dash_actionPostJobDesc") },
    { href: "/client/jobs", icon: FileSearch, label: t("dash_actionMyJobs"), description: t("dash_actionMyJobsDesc") },
    { href: "/client/messages", icon: MessageSquare, label: t("dash_actionMessages"), description: t("dash_actionMessagesDesc") },
    { href: "/client/reviews", icon: Star, label: t("dash_actionMyReviews"), description: t("dash_actionMyReviewsDesc") },
    { href: "/client/escrow", icon: CreditCard, label: t("dash_actionEscrow"), description: t("dash_actionEscrowDesc") },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">{t("dash_quickActionsTitle")}</h3>
      </div>
      <ul className="divide-y divide-slate-100">
        {ACTIONS.map(({ href, icon: Icon, label, description }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <Icon className="h-4 w-4 text-slate-500 group-hover:text-primary transition-colors" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 group-hover:text-primary transition-colors">{label}</p>
                <p className="text-xs text-slate-400">{description}</p>
              </div>
              <span className="ml-auto text-slate-300 group-hover:text-primary transition-colors text-sm">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
