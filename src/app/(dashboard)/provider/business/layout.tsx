"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Users,
  Briefcase,
  Wallet,
  PieChart,
  MapPin,
  BadgeCheck,
  ShieldCheck,
  CalendarDays,
  UsersRound,
  FileText,
  Layers,
  Star,
  Wrench,
  Settings,
  ReceiptText,
} from "lucide-react";

const NAV = [
  { label: "Hub",         href: "/provider/business",               icon: Building2   },
  { label: "Jobs",        href: "/provider/business/jobs",          icon: Briefcase   },
  { label: "Schedule",    href: "/provider/business/schedule",      icon: CalendarDays },
  { label: "Staff",       href: "/provider/business/staff",         icon: Users       },
  { label: "Clients",     href: "/provider/business/clients",       icon: UsersRound  },
  { label: "Quotations",  href: "/provider/business/quotations",    icon: FileText    },
  { label: "Services",    href: "/provider/business/services",      icon: Layers      },
  { label: "Territories", href: "/provider/business/service-areas", icon: MapPin      },
  { label: "Earnings",    href: "/provider/business/earnings",      icon: Wallet      },
  { label: "Reviews",     href: "/provider/business/reviews",       icon: Star        },
  { label: "Analytics",   href: "/provider/business/analytics",     icon: PieChart    },
  { label: "Equipment",   href: "/provider/business/equipment",     icon: Wrench      },
  { label: "Profile",     href: "/provider/business/profile",       icon: BadgeCheck  },
  { label: "Compliance",  href: "/provider/business/compliance",    icon: ShieldCheck },
  { label: "Billing",     href: "/provider/business/billing",       icon: ReceiptText },
  { label: "Settings",    href: "/provider/business/settings",      icon: Settings    },
];

export default function ProviderBusinessLayout({
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
          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
            Business
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(({ label, href, icon: Icon }) => {
            const exact = href === "/provider/business";
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full ${
                  active
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-indigo-500 dark:text-indigo-400" : ""}`} />
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
            const exact = href === "/provider/business";
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
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
