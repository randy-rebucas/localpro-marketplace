import Link from "next/link";
import { Store, Briefcase, MessageSquare, User, Star, Wallet, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function QuickActions() {
  const t = await getTranslations("providerPages");
  const ACTIONS = [
    {
      href: "/provider/marketplace",
      icon: Store,
      label: t("provDash_qaMarketplace"),
      description: t("provDash_qaMarketplaceSub"),
    },
    {
      href: "/provider/jobs",
      icon: Briefcase,
      label: t("provDash_qaJobs"),
      description: t("provDash_qaJobsSub"),
    },
    {
      href: "/provider/earnings",
      icon: Wallet,
      label: t("provDash_qaEarnings"),
      description: t("provDash_qaEarningsSub"),
    },
    {
      href: "/provider/messages",
      icon: MessageSquare,
      label: t("provDash_qaMessages"),
      description: t("provDash_qaMessagesSub"),
    },
    {
      href: "/provider/profile",
      icon: User,
      label: t("provDash_qaProfile"),
      description: t("provDash_qaProfileSub"),
    },
    {
      href: "/provider/reviews",
      icon: Star,
      label: t("provDash_qaReviews"),
      description: t("provDash_qaReviewsSub"),
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 text-sm">{t("provDash_quickActionsTitle")}</h3>
      </div>
      <ul className="divide-y divide-slate-100">
        {ACTIONS.map(({ href, icon: Icon, label, description }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-400">{description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
