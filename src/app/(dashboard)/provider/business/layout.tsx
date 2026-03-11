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
  { label: "Hub",           href: "/provider/business",               icon: Building2  },
  { label: "Jobs",          href: "/provider/business/jobs",          icon: Briefcase  },
  { label: "Schedule",      href: "/provider/business/schedule",      icon: CalendarDays },
  { label: "Staff",         href: "/provider/business/staff",         icon: Users      },
  { label: "Clients",       href: "/provider/business/clients",       icon: UsersRound },
  { label: "Quotations",    href: "/provider/business/quotations",    icon: FileText   },
  { label: "Services",      href: "/provider/business/services",      icon: Layers     },
  { label: "Territories",   href: "/provider/business/service-areas", icon: MapPin     },
  { label: "Earnings",      href: "/provider/business/earnings",      icon: Wallet     },
  { label: "Reviews",       href: "/provider/business/reviews",       icon: Star       },
  { label: "Analytics",     href: "/provider/business/analytics",     icon: PieChart   },
  { label: "Equipment",     href: "/provider/business/equipment",     icon: Wrench     },
  { label: "Profile",       href: "/provider/business/profile",       icon: BadgeCheck },
  { label: "Compliance",    href: "/provider/business/compliance",    icon: ShieldCheck },
  { label: "Billing",       href: "/provider/business/billing",       icon: ReceiptText  },
  { label: "Settings",      href: "/provider/business/settings",      icon: Settings     },
];

export default function ProviderBusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex gap-6 items-start min-h-0">

      {/* ── Left sub-nav ── */}
      <aside className="hidden lg:flex flex-col w-44 xl:w-48 flex-shrink-0 sticky top-0 self-start">
        <nav className="bg-white border border-slate-200 rounded-2xl p-2 space-y-0.5">
          {NAV.map(({ label, href, icon: Icon }) => {
            const exact = href === "/provider/business";
            const active = exact ? pathname === href : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium
                  transition-colors w-full
                  ${active
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }
                `}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Mobile top nav (small screens only) ── */}
      <nav className="lg:hidden sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-white border-b border-slate-100 w-full">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {NAV.map(({ label, href, icon: Icon }) => {
            const exact = href === "/provider/business";
            const active = exact ? pathname === href : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`
                  flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium
                  whitespace-nowrap transition-colors
                  ${active
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }
                `}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Page content ── */}
      <div className="flex-1 min-w-0">{children}</div>

    </div>
  );
}
