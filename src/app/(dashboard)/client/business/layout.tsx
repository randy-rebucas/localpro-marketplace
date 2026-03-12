"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  MapPin,
  Users,
  Wallet,
  PieChart,
  Briefcase,
  CreditCard,
  Shield,
  ReceiptText,
} from "lucide-react";

const NAV = [
  { label: "Hub",       href: "/client/business",            icon: Building2   },
  { label: "Locations", href: "/client/business/locations",  icon: MapPin      },
  { label: "Jobs",      href: "/client/business/jobs",       icon: Briefcase   },
  { label: "Members",   href: "/client/business/members",    icon: Users       },
  { label: "Budget",    href: "/client/business/budget",     icon: Wallet      },
  { label: "Analytics", href: "/client/business/analytics",  icon: PieChart    },
  { label: "Escrow",    href: "/client/business/escrow",     icon: CreditCard  },
  { label: "Disputes",  href: "/client/business/disputes",   icon: Shield      },
  { label: "Billing",   href: "/client/business/billing",    icon: ReceiptText },
];

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    // Negative margin breaks out of DashboardShell's p-4/p-6 so the sidebar
    // can run edge-to-edge against the shell border.
    <div className="flex -m-4 sm:-m-6 min-h-full">

      {/* ── Left sidebar (desktop) ── */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">

        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 dark:border-slate-700">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
            Business
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(({ label, href, icon: Icon }) => {
            const exact = href === "/client/business";
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full ${
                  active
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-blue-500 dark:text-blue-400" : ""}`} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Mobile top nav ── */}
      <nav className="lg:hidden sticky top-0 z-20 px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 w-full">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {NAV.map(({ label, href, icon: Icon }) => {
            const exact = href === "/client/business";
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Page content ── */}
      <div className="flex-1 min-w-0 p-4 sm:p-6">{children}</div>

    </div>
  );
}

