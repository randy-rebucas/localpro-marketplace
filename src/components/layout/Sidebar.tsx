"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  LayoutDashboard,
  PlusCircle,
  Sparkles,
  ClipboardList,
  Lock,
  Star,
  Bell,
  Store,
  Briefcase,
  CircleDollarSign,
  BarChart3,
  CheckCircle,
  Scale,
  Ticket,
  AlertTriangle,
  Users,
  MapPin,
  Tag,
  LogOut,
  X,
  Banknote,
  Heart,
  Headphones,
  CalendarDays,
  TrendingUp,
  ShieldCheck,
  UserCog,
  ScrollText,
  Megaphone,
  BookOpen,
  Eye,
  ShieldAlert,
  Repeat2,
  Building2,
  Wallet,
  Settings,
  ChevronRight,
  PanelLeftClose,
  Handshake,
  GraduationCap,
  UsersRound,
  Zap,
  FileBarChart,
  Database,
  MessageSquare,
  Brain,
  TrendingUpIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** null = always visible; string = capability required; "__admin_only__" = hidden for staff */
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
        { label: "Dashboard", href: "/client/dashboard", icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
      ],
    },
    {
      heading: "Jobs",
      items: [
        { label: "Post a Job", href: "/client/post-job", icon: <PlusCircle className="h-4.5 w-4.5" /> },
        { label: "My Jobs", href: "/client/jobs", icon: <ClipboardList className="h-4.5 w-4.5" /> },
        { label: "Consultations", href: "/client/consultations", icon: <Eye className="h-4.5 w-4.5" /> },
        { label: "Recurring Bookings", href: "/client/recurring", icon: <Repeat2 className="h-4.5 w-4.5" /> },
        { label: "Escrow", href: "/client/escrow", icon: <Lock className="h-4.5 w-4.5" /> },
        { label: "Wallet", href: "/client/wallet", icon: <Wallet className="h-4.5 w-4.5" /> },
        { label: "Favorites", href: "/client/favorites", icon: <Heart className="h-4.5 w-4.5" /> },
        { label: "Reviews", href: "/client/reviews", icon: <Star className="h-4.5 w-4.5" /> },
      ],
    },
    {
      heading: "Business",
      items: [
        { label: "Business Hub", href: "/client/business", icon: <Building2 className="h-4.5 w-4.5" /> },
      ],
    },
    {
      heading: "Support",
      items: [
        { label: "Help Center", href: "/client/knowledge", icon: <BookOpen className="h-4.5 w-4.5" /> },
        { label: "Live Chat & Tickets", href: "/client/support", icon: <Headphones className="h-4.5 w-4.5" /> },
      ],
    },
  ],
  provider: [
    {
      items: [
        { label: "Dashboard", href: "/provider/dashboard", icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
      ],
    },
    {
      heading: "Work",
      items: [
        { label: "Marketplace", href: "/provider/marketplace", icon: <Store className="h-4.5 w-4.5" /> },
        { label: "Active Jobs", href: "/provider/jobs", icon: <Briefcase className="h-4.5 w-4.5" /> },
        { label: "Consultations", href: "/provider/consultations", icon: <Eye className="h-4.5 w-4.5" /> },
        { label: "Calendar", href: "/provider/calendar", icon: <CalendarDays className="h-4.5 w-4.5" /> },
      ],
    },
    {
      heading: "Finance",
      items: [
        { label: "Earnings", href: "/provider/earnings", icon: <CircleDollarSign className="h-4.5 w-4.5" /> },
        { label: "Payouts", href: "/provider/payouts", icon: <Banknote className="h-4.5 w-4.5" /> },
        { label: "Wallet", href: "/provider/wallet", icon: <Wallet className="h-4.5 w-4.5" /> },
        { label: "Boost", href: "/provider/boost", icon: <Zap className="h-4.5 w-4.5" /> },
      ],
    },
    {
      heading: "Business",
      items: [
        { label: "Agency Hub", href: "/provider/business", icon: <Building2 className="h-4.5 w-4.5" /> },
      ],
    },
    {
      heading: "Growth",
      items: [
        { label: "Training", href: "/provider/training", icon: <GraduationCap className="h-4.5 w-4.5" /> },
      ],
    },
    {
      heading: "Support",
      items: [
        { label: "Help Center", href: "/provider/knowledge", icon: <BookOpen className="h-4.5 w-4.5" /> },
        { label: "Live Chat & Tickets", href: "/provider/support", icon: <Headphones className="h-4.5 w-4.5" /> },
      ],
    },
  ],
  admin: [
    {
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="h-4.5 w-4.5" />, capability: null },
      ],
    },
    {
      heading: "Marketplace",
      items: [
        { label: "All Jobs",      href: "/admin/all-jobs",   icon: <Briefcase     className="h-4.5 w-4.5" />, capability: "manage_jobs" },
        { label: "Validate Jobs", href: "/admin/jobs",       icon: <CheckCircle   className="h-4.5 w-4.5" />, capability: "manage_jobs" },
        { label: "Categories",    href: "/admin/categories", icon: <Tag           className="h-4.5 w-4.5" />, capability: "manage_categories" },
        { label: "Courses",       href: "/admin/courses",    icon: <GraduationCap className="h-4.5 w-4.5" />, capability: "manage_courses" },
      ],
    },
    {
      heading: "Users",
      items: [
        { label: "All Users",   href: "/admin/users",      icon: <Users      className="h-4.5 w-4.5" />, capability: "manage_users" },
        { label: "Agencies",    href: "/admin/agencies",   icon: <UsersRound className="h-4.5 w-4.5" />, capability: "manage_agencies" },
        { label: "Businesses",  href: "/admin/businesses", icon: <Building2  className="h-4.5 w-4.5" />, capability: "manage_businesses" },
        { label: "Staff",       href: "/admin/staff",      icon: <UserCog    className="h-4.5 w-4.5" />, capability: "__admin_only__" },
      ],
    },
    {
      heading: "Moderation",
      items: [
        { label: "Disputes",       href: "/admin/disputes", icon: <AlertTriangle className="h-4.5 w-4.5" />, capability: "manage_disputes" },
        { label: "Fraud Monitor",  href: "/admin/fraud",    icon: <ShieldAlert   className="h-4.5 w-4.5" />, capability: "manage_jobs" },
        { label: "KYC Review",     href: "/admin/kyc",      icon: <ShieldCheck   className="h-4.5 w-4.5" />, capability: "manage_kyc" },
        { label: "Activity Logs",  href: "/admin/logs",     icon: <ScrollText    className="h-4.5 w-4.5" />, capability: "__admin_only__" },
      ],
    },
    {
      heading: "AI Automation",
      items: [
        { label: "Decision Queue",   href: "/admin/approval-queue", icon: <Brain           className="h-4.5 w-4.5" />, capability: "manage_operations" },
        { label: "AI Performance",   href: "/admin/ai-performance", icon: <TrendingUpIcon  className="h-4.5 w-4.5" />, capability: "manage_operations" },
        { label: "AI Metrics",       href: "/admin/ai-metrics",     icon: <FileBarChart   className="h-4.5 w-4.5" />, capability: "manage_operations" },
      ],
    },
    {
      heading: "Finance",
      items: [
        { label: "Revenue",            href: "/admin/revenue",    icon: <TrendingUp className="h-4.5 w-4.5" />, capability: "view_revenue" },
        { label: "Accounting",         href: "/admin/accounting", icon: <Scale      className="h-4.5 w-4.5" />, capability: "view_revenue" },
        { label: "Payouts",            href: "/admin/payouts",    icon: <Banknote   className="h-4.5 w-4.5" />, capability: "manage_payouts" },
        { label: "Wallet Withdrawals", href: "/admin/wallet",     icon: <Wallet     className="h-4.5 w-4.5" />, capability: "manage_payouts" },
      ],
    },
    {
      heading: "Communication",
      items: [
        { label: "Support Inbox",  href: "/admin/support",         icon: <Headphones className="h-4.5 w-4.5" />, capability: "manage_support" },
        { label: "Ticket Queue",   href: "/admin/support/tickets", icon: <Ticket     className="h-4.5 w-4.5" />, capability: "manage_support" },
        { label: "Announcements",  href: "/admin/announcements",   icon: <Megaphone  className="h-4.5 w-4.5" />, capability: "__admin_only__" },
        { label: "Blogs",          href: "/admin/blogs",           icon: <BookOpen   className="h-4.5 w-4.5" />, capability: "manage_blogs" },
        { label: "Blog Comments",  href: "/admin/comments",        icon: <MessageSquare className="h-4.5 w-4.5" />, capability: "manage_blogs" },
        { label: "Blog Analytics", href: "/admin/analytics",       icon: <BarChart3    className="h-4.5 w-4.5" />, capability: "manage_blogs" },
        { label: "Knowledge Base", href: "/admin/knowledge",       icon: <BookOpen   className="h-4.5 w-4.5" />, capability: "__admin_only__" },
        { label: "Notifications",  href: "/admin/notifications",   icon: <Bell       className="h-4.5 w-4.5" />, capability: null },
      ],
    },
    {
      heading: "Partners",
      items: [
        { label: "PESO Partners", href: "/admin/partners", icon: <Handshake className="h-4.5 w-4.5" />, capability: "manage_users" },
      ],
    },
    {
      heading: "Platform",
      items: [
        { label: "App Settings", href: "/admin/settings", icon: <Settings  className="h-4.5 w-4.5" />, capability: "__admin_only__" },
        { label: "Database",     href: "/admin/database", icon: <Database  className="h-4.5 w-4.5" />, capability: "__admin_only__" },
      ],
    },
  ],
  peso: [
    {
      items: [
        { label: "Dashboard", href: "/peso/dashboard", icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
      ],
    },
    {
      heading: "Workforce",
      items: [
        { label: "Workforce Registry", href: "/peso/workforce", icon: <Users className="h-4.5 w-4.5" /> },
        { label: "Provider Verification", href: "/peso/verification", icon: <ShieldCheck className="h-4.5 w-4.5" /> },
        { label: "Referrals", href: "/peso/referrals", icon: <UserCog className="h-4.5 w-4.5" /> },
        { label: "Bulk Onboarding", href: "/peso/onboarding", icon: <ScrollText className="h-4.5 w-4.5" /> },
        { label: "My Office", href: "/peso/officers", icon: <Building2 className="h-4.5 w-4.5" /> },
      ],
    },
    {
      heading: "Programs",
      items: [
        { label: "Training & Certs", href: "/peso/training", icon: <GraduationCap className="h-4.5 w-4.5" /> },
        { label: "Livelihood Groups", href: "/peso/groups", icon: <UsersRound className="h-4.5 w-4.5" /> },
        { label: "Emergency", href: "/peso/emergency", icon: <Zap className="h-4.5 w-4.5" /> },
      ],
    },
    {
      heading: "Job Board",
      items: [
        { label: "PESO Jobs", href: "/peso/jobs", icon: <Briefcase className="h-4.5 w-4.5" /> },
        { label: "Post a Job", href: "/peso/jobs/new", icon: <PlusCircle className="h-4.5 w-4.5" /> },
      ],
    },
    {
      heading: "Reports",
      items: [
        { label: "Analytics", href: "/peso/reports", icon: <FileBarChart className="h-4.5 w-4.5" /> },
      ],
    },
    {
      heading: "Admin",
      items: [
        { label: "Settings", href: "/peso/settings", icon: <Settings className="h-4.5 w-4.5" /> },
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

const ROLE_COLORS: Record<string, string> = {
  client: "bg-sky-500/20 text-sky-300",
  provider: "bg-emerald-500/20 text-emerald-300",
  admin: "bg-violet-500/20 text-violet-300",
  staff: "bg-amber-500/20 text-amber-300",
  peso: "bg-blue-500/20 text-blue-300",
};

const ROLE_AVATAR_BG: Record<string, string> = {
  client: "bg-blue-600",
  provider: "bg-violet-600",
  admin: "bg-amber-600",
  staff: "bg-teal-600",
  peso: "bg-blue-700",
};

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

  // ── Collapsed state (desktop) — persisted in localStorage ──────────────────
  const STORAGE_KEY = "sidebar_collapsed";
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // localStorage unavailable (SSR / private browsing)
    }
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* noop */ }
  }

  const sourceRole = role === "staff" ? "admin" : role;
  const rawGroups = navGroups[sourceRole] ?? [];
  const baseGroups =
    role === "staff" && capabilities
      ? filterForStaff(rawGroups, capabilities)
      : rawGroups;

  const groups =
    (role === "client" && user?.accountType !== "business") ||
    (role === "provider" && user?.accountType !== "business" && !user?.agencyId)
      ? baseGroups.filter((g) => g.heading !== "Business")
      : baseGroups;

  async function handleLogout() {
    await logout();
    toast.success("You have been signed out");
    router.push("/login");
  }

  const roleBadgeClass = ROLE_COLORS[role] ?? "bg-white/10 text-primary-300";
  const avatarBg = ROLE_AVATAR_BG[role] ?? "bg-primary";

  // Don't apply collapsed width until client has read localStorage (avoids flash)
  const isCollapsed = mounted && collapsed;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "bg-primary-950 flex flex-col h-full flex-shrink-0 border-r border-slate-700/50",
          "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-[68px]" : "w-64"
        )}
      >
        {/* ── Brand ──────────────────────────────────────────────────────── */}
        <div className={cn(
          "flex items-center border-b border-slate-700/50 transition-all duration-300",
          isCollapsed ? "justify-center px-0 py-4" : "justify-between px-5 py-4"
        )}>
          {isCollapsed ? (
            <button
              onClick={toggleCollapsed}
              title="Expand sidebar"
              className="hidden md:flex flex-shrink-0 w-8 h-8 bg-primary rounded-lg items-center justify-center shadow-sm hover:bg-primary/80 transition-colors"
            >
              <MapPin className="w-4 h-4 text-white" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <span className="text-[17px] font-bold tracking-tight">
                  <span className="text-primary-200">Local</span><span className="text-brand-400">Pro</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Collapse toggle — desktop only */}
                <button
                  onClick={toggleCollapsed}
                  title="Collapse sidebar"
                  className="hidden md:flex p-1.5 rounded-md text-primary-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
                {/* Mobile close */}
                <button
                  onClick={onClose}
                  className="md:hidden p-1.5 rounded-md text-primary-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── User card ──────────────────────────────────────────────────── */}
        <div className={cn("pt-3 pb-2 transition-all duration-300", isCollapsed ? "px-2" : "px-3")}>
          {isCollapsed ? (
            <Link
              href={`/${sourceRole}/profile`}
              onClick={onClose}
              title={user?.name ?? "Profile"}
              className="flex items-center justify-center w-full"
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-white/10">
                <UserAvatar
                  avatarUrl={user?.avatar}
                  gravatarUrl={user?.gravatarUrl}
                  name={user?.name}
                  size={36}
                  roundedClass="rounded-lg"
                  className="w-9 h-9"
                  fallbackClassName={`${avatarBg} text-white`}
                />
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-slate-700/50">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/10">
                <UserAvatar
                  avatarUrl={user?.avatar}
                  gravatarUrl={user?.gravatarUrl}
                  name={user?.name}
                  size={32}
                  roundedClass="rounded-lg"
                  className="w-8 h-8"
                  fallbackClassName={`${avatarBg} text-white`}
                />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-white truncate leading-tight">
                  {user?.name ?? "—"}
                </p>
                <span className={cn("inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wide", roleBadgeClass)}>
                  {role}
                </span>
              </div>
              <Link
                href={`/${sourceRole}/profile`}
                onClick={onClose}
                className="flex-shrink-0 p-1 rounded-md text-primary-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Go to profile"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* ── Nav ────────────────────────────────────────────────────────── */}
        <nav className={cn(
          "flex-1 pt-1 pb-4 sidebar-scroll overflow-y-auto space-y-5 transition-all duration-300",
          isCollapsed ? "px-2" : "px-3"
        )}>
          {groups.map((group, gi) => (
            <div key={gi}>
              {/* Group heading — only in expanded mode */}
              {!isCollapsed && group.heading && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-primary-500/80 select-none">
                  {group.heading}
                </p>
              )}
              {/* Divider between groups in collapsed mode */}
              {isCollapsed && gi > 0 && (
                <div className="border-t border-slate-700/40 mb-2" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "group flex items-center rounded-lg text-sm font-medium transition-all duration-150 relative",
                        isCollapsed
                          ? "justify-center w-full px-0 py-2.5"
                          : "gap-3 pl-3 pr-2 py-2",
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-primary-300/80 hover:bg-white/6 hover:text-white"
                      )}
                    >
                      {/* Left accent bar — only expanded */}
                      {!isCollapsed && (
                        <span
                          className={cn(
                            "absolute left-0 inset-y-1.5 w-0.5 rounded-full transition-all duration-150",
                            isActive ? "bg-primary-300 opacity-100" : "opacity-0 group-hover:opacity-40 bg-primary-400"
                          )}
                        />
                      )}
                      <span className={cn(
                        "flex-shrink-0 transition-colors duration-150",
                        isActive ? "text-primary-200" : "text-primary-400/70 group-hover:text-primary-300"
                      )}>
                        {item.icon}
                      </span>
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Collapse toggle (desktop only) + Sign out ──────────────────── */}
        {/* Upgrade to Business CTA — only for personal client accounts */}
        {role === "client" && user?.accountType !== "business" && (
          isCollapsed ? (
            <Link
              href="/client/upgrade"
              onClick={onClose}
              title="Upgrade to Business"
              className="flex justify-center w-full px-0 py-2.5 rounded-lg bg-gradient-to-b from-amber-500/20 to-orange-500/10 border border-amber-500/40 hover:border-amber-400/70 transition-all duration-150"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
            </Link>
          ) : (
            <Link
              href="/client/upgrade"
              onClick={onClose}
              className="group block w-full rounded-xl overflow-hidden border border-amber-500/30 hover:border-amber-400/60 transition-all duration-200 mb-1"
            >
              <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-yellow-500/5 px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">Go Business</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-snug">
                  Post unlimited jobs, manage a team &amp; unlock priority support.
                </p>
                <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-amber-300 group-hover:text-amber-200 transition-colors">
                  Upgrade now
                  <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          )
        )}
        {/* Upgrade to Agency CTA — only for solo providers (not agency owners, not agency staff) */}
        {role === "provider" && user?.accountType !== "business" && !user?.agencyId && (
          isCollapsed ? (
            <Link
              href="/provider/upgrade"
              onClick={onClose}
              title="Upgrade to Agency"
              className="flex justify-center w-full px-0 py-2.5 rounded-lg bg-emerald-900/60 border border-emerald-700/60 hover:border-emerald-600 transition-all duration-150"
            >
              <Building2 className="h-4 w-4 text-emerald-400" />
            </Link>
          ) : (
            <Link
              href="/provider/upgrade"
              onClick={onClose}
              className="group block w-full rounded-xl overflow-hidden border border-emerald-700/50 hover:border-emerald-600 bg-emerald-950/60 hover:bg-emerald-950 transition-all duration-200 mb-1"
            >
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Go Agency</span>
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  Manage a team, take bigger jobs &amp; unlock agency tools.
                </p>
                <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                  Upgrade now
                  <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          )
        )}
        <div className={cn(
          "pb-4 pt-2 border-t border-slate-700/50 space-y-0.5 transition-all duration-300",
          isCollapsed ? "px-2" : "px-3"
        )}>
          {/* Sign out */}
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Sign out" : undefined}
            className={cn(
              "group w-full rounded-lg text-sm font-medium text-primary-300/80 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150",
              isCollapsed ? "flex justify-center px-0 py-2.5" : "flex items-center gap-3 pl-3 pr-2 py-2"
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0 transition-colors group-hover:text-red-400" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
