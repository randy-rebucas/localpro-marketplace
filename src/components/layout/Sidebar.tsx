"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Lock,
  Star,
  Bell,
  Store,
  Briefcase,
  CircleDollarSign,
  User,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Users,
  MapPin,
  Tag,
  LogOut,
  Banknote,
  Heart,
  MessageSquare,
  Headphones,
  CalendarDays,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  heading?: string;
  items: NavItem[];
}

const navGroups: Record<UserRole, NavGroup[]> = {
  client: [
    {
      items: [
        { label: "Dashboard",  href: "/client/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
      ],
    },
    {
      heading: "Jobs",
      items: [
        { label: "Post a Job", href: "/client/post-job",  icon: <PlusCircle    className="h-5 w-5" /> },
        { label: "My Jobs",    href: "/client/jobs",      icon: <ClipboardList  className="h-5 w-5" /> },
        { label: "Escrow",     href: "/client/escrow",    icon: <Lock           className="h-5 w-5" /> },
        { label: "Favorites",  href: "/client/favorites", icon: <Heart          className="h-5 w-5" /> },
        { label: "Reviews",    href: "/client/reviews",   icon: <Star           className="h-5 w-5" /> },
      ],
    },
    {
      heading: "Communication",
      items: [
        { label: "Messages",   href: "/client/messages",  icon: <MessageSquare  className="h-5 w-5" /> },
        { label: "Support",    href: "/client/support",   icon: <Headphones     className="h-5 w-5" /> },
      ],
    },
    {
      heading: "Account",
      items: [
        { label: "My Profile",    href: "/client/profile",       icon: <User className="h-5 w-5" /> },
        { label: "Notifications", href: "/client/notifications",  icon: <Bell className="h-5 w-5" /> },
      ],
    },
  ],
  provider: [
    {
      items: [
        { label: "Dashboard",   href: "/provider/dashboard",  icon: <LayoutDashboard  className="h-5 w-5" /> },
      ],
    },
    {
      heading: "Work",
      items: [
        { label: "Marketplace", href: "/provider/marketplace", icon: <Store        className="h-5 w-5" /> },
        { label: "Active Jobs", href: "/provider/jobs",        icon: <Briefcase    className="h-5 w-5" /> },
        { label: "Calendar",    href: "/provider/calendar",    icon: <CalendarDays className="h-5 w-5" /> },
      ],
    },
    {
      heading: "Finance",
      items: [
        { label: "Earnings",    href: "/provider/earnings",   icon: <CircleDollarSign className="h-5 w-5" /> },
        { label: "Payouts",     href: "/provider/payouts",    icon: <Banknote         className="h-5 w-5" /> },
      ],
    },
    {
      heading: "Communication",
      items: [
        { label: "Messages",    href: "/provider/messages",  icon: <MessageSquare className="h-5 w-5" /> },
        { label: "Support",     href: "/provider/support",   icon: <Headphones    className="h-5 w-5" /> },
      ],
    },
    {
      heading: "Account",
      items: [
        { label: "My Profile",    href: "/provider/profile",        icon: <User className="h-5 w-5" /> },
        { label: "Notifications", href: "/provider/notifications",  icon: <Bell className="h-5 w-5" /> },
      ],
    },
  ],
  admin: [
    {
      items: [
        { label: "Dashboard",  href: "/admin/dashboard", icon: <BarChart3  className="h-5 w-5" /> },
      ],
    },
    {
      heading: "Operations",
      items: [
        { label: "Validate Jobs", href: "/admin/jobs",      icon: <CheckCircle   className="h-5 w-5" /> },
        { label: "KYC Review",    href: "/admin/kyc",       icon: <ShieldCheck   className="h-5 w-5" /> },
        { label: "Disputes",      href: "/admin/disputes",  icon: <AlertTriangle className="h-5 w-5" /> },
      ],
    },
    {
      heading: "Finance",
      items: [
        { label: "Revenue", href: "/admin/revenue", icon: <TrendingUp className="h-5 w-5" /> },
        { label: "Payouts", href: "/admin/payouts", icon: <Banknote   className="h-5 w-5" /> },
      ],
    },
    {
      heading: "Users",
      items: [
        { label: "Users",      href: "/admin/users",      icon: <Users className="h-5 w-5" /> },
        { label: "Categories", href: "/admin/categories", icon: <Tag   className="h-5 w-5" /> },
      ],
    },
    {
      heading: "Communication",
      items: [
        { label: "Support Inbox",  href: "/admin/support",        icon: <Headphones className="h-5 w-5" /> },
        { label: "Notifications",  href: "/admin/notifications",  icon: <Bell       className="h-5 w-5" /> },
      ],
    },
  ],
};

interface SidebarProps {
  role: UserRole;
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const groups = navGroups[role] ?? [];

  async function handleLogout() {
    await logout();
    toast.success("You have been signed out");
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-primary-950 flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold">
          <span className="text-primary-300">Local</span><span className="text-brand-400">Pro</span>
        </span>
      </div>

      {/* Role badge */}
      <div className="px-6 pt-4 pb-2">
        <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">
          {role} portal
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4 sidebar-scroll overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {group.heading && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-primary-500">
                {group.heading}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : "text-primary-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
