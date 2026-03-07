import Link from "next/link";
import { Store, Briefcase, MessageSquare, User, Star, Wallet, FileText } from "lucide-react";

const ACTIONS = [
  {
    href: "/provider/marketplace",
    icon: Store,
    label: "Marketplace",
    description: "Browse & submit quotes",
  },
  {
    href: "/provider/jobs",
    icon: Briefcase,
    label: "My Jobs",
    description: "Track your work",
  },
  {
    href: "/provider/earnings",
    icon: Wallet,
    label: "Withdraw Earnings",
    description: "Request a payout",
  },
  {
    href: "/provider/messages",
    icon: MessageSquare,
    label: "Messages",
    description: "Chat with clients",
  },
  {
    href: "/provider/profile",
    icon: User,
    label: "My Profile",
    description: "Update your profile",
  },
  {
    href: "/provider/reviews",
    icon: Star,
    label: "My Reviews",
    description: "Client feedback",
  },
];

export function QuickActions() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 text-sm">Quick Actions</h3>
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
