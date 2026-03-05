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
    <div className="space-y-4">
      {/* Sub-navigation */}
      <nav className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-white border-b border-slate-100">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {NAV.map(({ label, href, icon: Icon }) => {
            const exact = href === "/client/business";
            const active = exact
              ? pathname === href
              : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`
                  flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium
                  whitespace-nowrap transition-colors
                  ${
                    active
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

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
