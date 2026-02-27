"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ChevronDown, LogOut, User, Shield, Briefcase } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import NotificationBell from "@/components/shared/NotificationBell";

interface HeaderProps {
  title?: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof User; color: string }> = {
  client:   { label: "Client",   icon: User,     color: "bg-blue-100 text-blue-700"    },
  provider: { label: "Provider", icon: Briefcase, color: "bg-violet-100 text-violet-700" },
  admin:    { label: "Admin",    icon: Shield,   color: "bg-amber-100 text-amber-700"  },
};

export default function Header({ title }: HeaderProps) {
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
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  const roleConfig = user?.role ? ROLE_CONFIG[user.role] : null;
  const RoleIcon = roleConfig?.icon ?? User;

  const profileHref =
    user?.role === "provider" ? "/provider/profile" :
    user?.role === "client"   ? "/client/dashboard" :
    null;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Page title */}
      <div>
        {title && (
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <NotificationBell />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition-colors"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold select-none">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-900 leading-tight">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize leading-tight">{user?.role}</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />

              {/* Dropdown */}
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-card-hover z-20 py-1 overflow-hidden"
              >
                {/* User info */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate mb-2">{user?.email}</p>
                  {roleConfig && (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${roleConfig.color}`}>
                      <RoleIcon className="h-3 w-3" />
                      {roleConfig.label}
                    </span>
                  )}
                </div>

                {/* Profile link (role-specific) */}
                {profileHref && (
                  <Link
                    href={profileHref}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    My Profile
                  </Link>
                )}

                {/* Sign out */}
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

