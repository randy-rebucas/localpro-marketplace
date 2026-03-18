import { create } from "zustand";
import type { PublicUser } from "@/types";
import { useNotificationStore } from "@/stores/notificationStore";
import { apiFetch } from "@/lib/fetchClient";
import { LOCALE_COOKIE, locales } from "@/i18n/config";

interface AuthState {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialized: boolean;
  setUser: (user: PublicUser | null) => void;
  setLoading: (loading: boolean) => void;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  initialized: false,

  setUser: (user) =>
    set({ user, isAuthenticated: Boolean(user) }),

  setLoading: (isLoading) => set({ isLoading }),

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const user = await res.json() as PublicUser;
        set({ user, isAuthenticated: true });

        // Sync the locale cookie from the user's DB preference so the server
        // renders in the correct language on the next request.
        const preferred = user.preferredLocale;
        if (preferred && (locales as readonly string[]).includes(preferred)) {
          const currentCookie = document.cookie.match(
            new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`)
          )?.[1];
          if (currentCookie !== preferred) {
            document.cookie = `${LOCALE_COOKIE}=${preferred}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
          }
        }
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false, initialized: true });
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      set({ user: null, isAuthenticated: false });
      useNotificationStore.getState().reset();
    }
  },
}));
