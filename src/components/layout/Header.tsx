"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { ChevronDown, LogOut, User, Shield, Briefcase, UserCog, Menu, Settings, Bell, Gift, MessageSquare, BookOpen } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import NotificationBell from "@/components/shared/NotificationBell";
import GlobalSearch from "@/components/shared/GlobalSearch";
import LocaleSwitcher from "@/components/ui/LocaleSwitcher";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof User; badgeColor: string; avatarBg: string }> = {
  client:   { label: "Client",   icon: User,     badgeColor: "bg-blue-100 text-blue-700",     avatarBg: "bg-blue-600"   },
  provider: { label: "Provider", icon: Briefcase, badgeColor: "bg-violet-100 text-violet-700", avatarBg: "bg-violet-600" },
  admin:    { label: "Admin",    icon: Shield,   badgeColor: "bg-amber-100 text-amber-700",   avatarBg: "bg-amber-600"  },
  staff:    { label: "Staff",    icon: UserCog,  badgeColor: "bg-teal-100 text-teal-700",     avatarBg: "bg-teal-600"   },
};

export default function Header({ title, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    toast.success("You have been signed out");
    router.push("/login");
  }

  const initials = user?.name
    ? user.name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const roleConfig = user?.role ? ROLE_CONFIG[user.role] : null;
  const RoleIcon = roleConfig?.icon ?? User;
  const avatarBg = roleConfig?.avatarBg ?? "bg-primary";

  const profileHref =
    user?.role === "provider" ? "/provider/profile" :
    user?.role === "client"   ? "/client/profile" :
    null;

  const settingsHref =
    user?.role === "provider" ? "/provider/settings" :
    user?.role === "client"   ? "/client/settings" :
    user?.role === "admin"    ? "/admin/settings" :
    null;

  const notificationsHref =
    user?.role === "provider" ? "/provider/notifications" :
    user?.role === "client"   ? "/client/notifications" :
    user?.role === "admin"    ? "/admin/notifications" :
    user?.role === "staff"    ? "/admin/notifications" :
    null;

  const rewardsHref = user?.role === "client" ? "/client/rewards" : null;

  const knowledgeHref =
    user?.role === "provider" ? "/provider/knowledge" :
    user?.role === "admin" || user?.role === "staff" ? "/admin/knowledge" :
    "/client/knowledge";

  const messagesHref =
    user?.role === "provider" ? "/provider/messages" :
    user?.role === "client"   ? "/client/messages" :
    user?.role === "admin"    ? "/admin/support" :
    user?.role === "staff"    ? "/admin/support" :
    null;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 shadow-sm">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && (
          <h1 className="text-base font-semibold text-slate-800 tracking-tight">{title}</h1>
        )}

        {/* Knowledge Base */}
        <Link
          href={knowledgeHref}
          aria-label="Knowledge Base"
          title="Knowledge Base"
          className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <BookOpen className="h-4.5 w-4.5" />
        </Link>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        {/* Global search */}
        <GlobalSearch />

        {/* Language switcher */}
        <LocaleSwitcher />

        {/* Messages */}
        {messagesHref && (
          <Link
            href={messagesHref}
            aria-label="Messages"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
          </Link>
        )}

        {/* Notification bell */}
        <NotificationBell />

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 mx-1.5 flex-shrink-0" />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Open user menu"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-slate-100">
              {user?.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name || "Avatar"}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center text-white text-xs font-bold select-none`}>
                  {initials}
                </div>
              )}
            </div>

            {/* Name + role badge (desktop only) */}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-900 leading-tight">{user?.name}</p>
              {roleConfig && (
                <p className={`text-[10px] font-semibold px-1.5 py-px rounded-full inline-block leading-tight mt-0.5 ${roleConfig.badgeColor}`}>
                  {roleConfig.label}
                </p>
              )}
            </div>

            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 hidden sm:block ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />

              {/* Dropdown */}
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl border border-slate-200 shadow-lg z-20 overflow-hidden"
              >
                {/* User card header */}
                <div className="px-4 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {user?.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.name || "Avatar"}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full ${avatarBg} flex items-center justify-center text-white text-sm font-bold select-none ring-2 ring-white`}>
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">{user?.email}</p>
                    {roleConfig && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-px rounded-full mt-1.5 ${roleConfig.badgeColor}`}>
                        <RoleIcon className="h-2.5 w-2.5" />
                        {roleConfig.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Staff capabilities */}
                {user?.role === "staff" && user.capabilities && user.capabilities.length > 0 && (
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-teal-50/50">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Capabilities</p>
                    <div className="flex flex-wrap gap-1">
                      {user.capabilities.map((cap) => (
                        <span key={cap} className="text-[10px] px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded-full font-medium">
                          {cap.replace(/^(manage_|view_)/, "").replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Menu items */}
                <div className="py-1">
                  {profileHref && (
                    <Link
                      href={profileHref}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      My Profile
                    </Link>
                  )}

                  {rewardsHref && (
                    <Link
                      href={rewardsHref}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Gift className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      Rewards
                    </Link>
                  )}

                  {notificationsHref && (
                    <Link
                      href={notificationsHref}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Bell className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      Notifications
                    </Link>
                  )}

                  {settingsHref && (
                    <Link
                      href={settingsHref}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      Settings
                    </Link>
                  )}
                </div>

                {/* Sign out */}
                <div className="border-t border-slate-100 py-1">
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

