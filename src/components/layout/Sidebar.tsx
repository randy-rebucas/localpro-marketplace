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
  X,
  Banknote,
  Heart,
  MessageSquare,
  Headphones,
  CalendarDays,
  TrendingUp,
  ShieldCheck,
  UserCog,
  ScrollText,
  Megaphone,
  BookOpen,
  Gift,
  Eye,
  ShieldAlert,
  Repeat2,
  Building2,
  Wallet,
  UserPlus,
  PieChart,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** null = always visible for all roles; string = capability key required; "__admin_only__" = hidden for staff */
  capability?: string | null;
}

interface NavGroup {
  heading?: string;
  items: NavItem[];
}

const navGroups: Partial<Record<UserRole, NavGroup[]>> = {
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
        { label: "Consultations",        href: "/client/consultations", icon: <Eye     className="h-5 w-5" /> },
        { label: "Recurring Bookings",    href: "/client/recurring",      icon: <Repeat2 className="h-5 w-5" /> },
        { label: "Escrow",                href: "/client/escrow",         icon: <Lock    className="h-5 w-5" /> },
        { label: "Favorites",  href: "/client/favorites", icon: <Heart          className="h-5 w-5" /> },
        { label: "Reviews",    href: "/client/reviews",   icon: <Star           className="h-5 w-5" /> },
      ],
    },
    {
      heading: "Communication",
      items: [
        { label: "Messages",        href: "/client/messages",   icon: <MessageSquare className="h-5 w-5" /> },
        { label: "Support",         href: "/client/support",    icon: <Headphones    className="h-5 w-5" /> },
        { label: "Knowledge Base",  href: "/client/knowledge",  icon: <BookOpen      className="h-5 w-5" /> },
      ],
    },
    {
      heading: "Business",
      items: [
        { label: "Business Hub",    href: "/client/business",            icon: <Building2  className="h-5 w-5" /> }
      ],
    },
    {
      heading: "Account",
      items: [
        { label: "Rewards",       href: "/client/rewards",        icon: <Gift className="h-5 w-5" /> },
        { label: "My Profile",    href: "/client/profile",        icon: <User className="h-5 w-5" /> },
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
        { label: "Consultations", href: "/provider/consultations", icon: <Eye className="h-5 w-5" /> },
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
        { label: "Messages",        href: "/provider/messages",   icon: <MessageSquare className="h-5 w-5" /> },
        { label: "Support",         href: "/provider/support",    icon: <Headphones    className="h-5 w-5" /> },
        { label: "Knowledge Base",  href: "/provider/knowledge",  icon: <BookOpen      className="h-5 w-5" /> },
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
        { label: "Dashboard",  href: "/admin/dashboard", icon: <BarChart3 className="h-5 w-5" />, capability: null },
      ],
    },
    {
      heading: "Operations",
      items: [
        { label: "Validate Jobs",  href: "/admin/jobs",      icon: <CheckCircle   className="h-5 w-5" />, capability: "manage_jobs" },
        { label: "Fraud Monitor",   href: "/admin/fraud",     icon: <ShieldAlert   className="h-5 w-5" />, capability: "manage_jobs" },
        { label: "KYC Review",     href: "/admin/kyc",       icon: <ShieldCheck   className="h-5 w-5" />, capability: "manage_kyc" },
        { label: "Disputes",       href: "/admin/disputes",  icon: <AlertTriangle className="h-5 w-5" />, capability: "manage_disputes" },
        { label: "Activity Logs",  href: "/admin/logs",      icon: <ScrollText    className="h-5 w-5" />, capability: "__admin_only__" },
      ],
    },
    {
      heading: "Finance",
      items: [
        { label: "Revenue", href: "/admin/revenue", icon: <TrendingUp className="h-5 w-5" />, capability: "view_revenue" },
        { label: "Payouts", href: "/admin/payouts", icon: <Banknote   className="h-5 w-5" />, capability: "manage_payouts" },
      ],
    },
    {
      heading: "Users",
      items: [
        { label: "Users",      href: "/admin/users",      icon: <Users   className="h-5 w-5" />, capability: "manage_users" },
        { label: "Staff",      href: "/admin/staff",      icon: <UserCog className="h-5 w-5" />, capability: "__admin_only__" },
        { label: "Categories", href: "/admin/categories", icon: <Tag     className="h-5 w-5" />, capability: "manage_categories" },
      ],
    },
    {
      heading: "Communication",
      items: [
        { label: "Support Inbox",  href: "/admin/support",        icon: <Headphones className="h-5 w-5" />, capability: "manage_support" },
        { label: "Announcements",  href: "/admin/announcements",  icon: <Megaphone  className="h-5 w-5" />, capability: "__admin_only__" },
        { label: "Knowledge Base", href: "/admin/knowledge",      icon: <BookOpen   className="h-5 w-5" />, capability: "__admin_only__" },
        { label: "Notifications",  href: "/admin/notifications",  icon: <Bell       className="h-5 w-5" />, capability: null },
      ],
    },
    {
      heading: "Platform",
      items: [
        { label: "App Settings", href: "/admin/settings", icon: <Settings className="h-5 w-5" />, capability: "__admin_only__" },
      ],
    },
  ],
};

/** Filter admin nav groups for a staff member based on their capabilities. */
function filterForStaff(groups: NavGroup[], capabilities: string[]): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.capability === undefined || item.capability === null) return true;
        if (item.capability === "__admin_only__") return false;
        return capabilities.includes(item.capability);
      }),
    }))
    .filter((group) => group.items.length > 0);
}

interface SidebarProps {
  role: UserRole;
  capabilities?: string[];
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ role, capabilities, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();

  // Staff shares the admin nav structure but filtered by capabilities
  const sourceRole = role === "staff" ? "admin" : role;
  const rawGroups = navGroups[sourceRole] ?? [];
  const baseGroups =
    role === "staff" && capabilities
      ? filterForStaff(rawGroups, capabilities)
      : rawGroups;

  // Hide the Business nav group unless the client has a business account type
  const groups =
    role === "client" && user?.accountType !== "business"
      ? baseGroups.filter((g) => g.heading !== "Business")
      : baseGroups;

  const portalLabel = role === "staff" ? "staff portal" : `${role} portal`;

  async function handleLogout() {
    await logout();
    toast.success("You have been signed out");
    router.push("/login");
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "w-64 bg-primary-950 flex flex-col h-full flex-shrink-0",
          // Mobile: fixed drawer that slides in/out
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
      {/* Brand */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold">
            <span className="text-primary-300">Local</span><span className="text-brand-400">Pro</span>
          </span>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden p-1 text-primary-300 hover:text-white transition-colors rounded"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Role badge */}
      <div className="px-6 pt-4 pb-2">
        <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">
          {portalLabel}
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
                    onClick={onClose}
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
    </>
  );
}
