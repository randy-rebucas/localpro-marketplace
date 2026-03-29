/**
 * Notification store — backed by real API data with SSE live updates.
 *
 * Usage:
 *   const { notifications, unreadCount, hydrate, connectSSE, disconnectSSE } =
 *     useNotificationStore();
 *
 * Call `hydrate()` once on mount (e.g., inside a layout useEffect).
 * Call `connectSSE()` after hydration to open the real-time stream.
 */

import { create } from "zustand";
import toast from "react-hot-toast";
import type { INotification } from "@/types";
import { apiFetch } from "@/lib/fetchClient";
import { playNotificationSound } from "@/lib/notificationSound";

export type { INotification as Notification };

// Per-type toast emoji — falls back to 🔔 for unknown types
const TOAST_EMOJI: Record<string, string> = {
  // Job lifecycle
  job_submitted:              "📋",
  job_approved:               "✅",
  job_rejected:               "❌",
  job_expired:                "⏰",
  job_direct_invite:          "🎯",
  recurring_job_spawned:      "🔄",
  // Quotes
  quote_received:             "📝",
  quote_accepted:             "🎉",
  quote_rejected:             "👎",
  quote_expired:              "⏰",
  // Payments & escrow
  escrow_funded:              "🔒",
  payment_confirmed:          "💳",
  payment_failed:             "❌",
  payment_reminder:           "💳",
  job_completed:              "🏁",
  escrow_released:            "💰",
  escrow_auto_released:       "💰",
  // Payouts
  payout_requested:           "🏦",
  payout_status_update:       "💵",
  // Disputes
  dispute_opened:             "⚠️",
  dispute_resolved:           "⚖️",
  // Reviews & messages
  review_received:            "⭐",
  new_message:                "💬",
  // Consultations
  consultation_request:       "📅",
  consultation_accepted:      "📅",
  estimate_provided:          "🧾",
  consultation_stale:         "📅",
  consultation_expired:       "📅",
  // Reminders
  reminder_fund_escrow:       "📌",
  reminder_no_quotes:         "📌",
  reminder_start_job:         "📌",
  reminder_complete_job:      "📌",
  reminder_leave_review:      "📌",
  reminder_stale_dispute:     "📌",
  reminder_pending_validation:"📌",
  reminder_profile_incomplete:"📌",
  // Admin
  admin_message:              "📢",
  // Wallet
  wallet_credited:            "💰",
  wallet_withdrawal_update:   "🏦",
  // Agency
  agency_job_assigned:        "📋",
  agency_staff_invited:       "🏢",
};

interface NotificationState {
  notifications: INotification[];
  unreadCount: number;
  hydrated: boolean;
  sseConnected: boolean;

  /** Fetch existing notifications from the API */
  hydrate: () => Promise<void>;

  /** Open SSE stream for live pushes */
  connectSSE: () => void;

  /** Close the SSE stream */
  disconnectSSE: () => void;

  /** Optimistically mark a single notification read (also calls API) */
  markRead: (id: string) => Promise<void>;

  /** Mark all read (also calls API) */
  markAllRead: () => Promise<void>;

  /**
   * Prepend an incoming SSE notification and surface a toast popup.
   * Pass `silent: true` to skip the toast (e.g. during bulk hydration).
   */
  _ingest: (n: INotification, silent?: boolean) => void;

  /** Clear all state and close SSE — call on logout */
  reset: () => void;
}

let _eventSource: EventSource | null = null;
let _visibilityCleanup: (() => void) | null = null;
let _sseRetries = 0;
const SSE_MAX_RETRIES = 5;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  hydrated: false,
  sseConnected: false,

  // ─── Hydrate ──────────────────────────────────────────────────────────────

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const res = await apiFetch("/api/notifications");
      if (!res.ok) return;
      // API returns { notifications: INotification[], unreadCount: number }
      const body = await res.json();
      const notifications: INotification[] = body.notifications ?? body ?? [];
      const unreadCount: number = body.unreadCount ?? notifications.filter((n) => !n.readAt).length;
      set({ notifications, unreadCount, hydrated: true });
    } catch {
      // silently ignore — user might not be logged in
    }
  },

  // ─── SSE ──────────────────────────────────────────────────────────────────

  connectSSE: () => {
    if (_eventSource) return; // already open
    if (typeof window === "undefined") return;

    const open = () => {
      if (_eventSource) return;
      _eventSource = new EventSource("/api/notifications/stream", {
        withCredentials: true,
      });

      _eventSource.onopen = () => { _sseRetries = 0; set({ sseConnected: true }); };

      _eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // Skip the initial connection confirmation event
          if (payload?.type === "connected") return;

          // Route silent status-update events to the status store
          if (payload?.__event === "status_update") {
            import("@/stores/statusStore").then(({ useStatusStore }) => {
              useStatusStore.getState().dispatch(payload);
            });
            return;
          }

          // Only ingest objects that look like INotification (have a title field)
          if (!payload?.title) return;
          get()._ingest(payload as INotification);
        } catch {
          // ignore malformed events
        }
      };

      _eventSource.onerror = () => {
        set({ sseConnected: false });
        // If the EventSource was permanently closed (e.g. 401 after token expiry
        // or server restart), reset so connectSSE() can reopen it.
        if (_eventSource && _eventSource.readyState === EventSource.CLOSED) {
          _eventSource.close();
          _eventSource = null;
          _sseRetries++;
          if (_sseRetries > SSE_MAX_RETRIES) {
            // Give up — likely unauthenticated. Will reconnect on next page load.
            return;
          }
          // Exponential backoff: 5s, 10s, 20s, 40s, 80s
          const delay = Math.min(5_000 * Math.pow(2, _sseRetries - 1), 80_000);
          setTimeout(() => open(), delay);
        }
      };
    };

    open();

    // Reconnect when the user returns to the tab after it was hidden
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !_eventSource) {
        open();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    // Store cleanup reference on the module-level variable so disconnectSSE can remove it
    _visibilityCleanup = () => document.removeEventListener("visibilitychange", onVisibility);
  },

  disconnectSSE: () => {
    if (_eventSource) {
      _eventSource.close();
      _eventSource = null;
    }
    _visibilityCleanup?.();
    _visibilityCleanup = null;
    _sseRetries = 0;
    set({ sseConnected: false });
  },

  // ─── Mutations ────────────────────────────────────────────────────────────

  markRead: async (id: string) => {
    // Optimistic update
    const prev = get().notifications;
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n._id?.toString() === id ? { ...n, readAt: new Date() } : n
      ),
      unreadCount: Math.max(
        0,
        state.notifications.filter((n) => !n.readAt && n._id?.toString() !== id).length
      ),
    }));
    const res = await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(() => null);
    if (!res || !res.ok) {
      // Roll back
      set({ notifications: prev, unreadCount: prev.filter((n) => !n.readAt).length });
      toast.error("Failed to mark notification as read");
    }
  },

  markAllRead: async () => {
    const prev = get().notifications;
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })),
      unreadCount: 0,
    }));
    const res = await apiFetch("/api/notifications", { method: "PATCH" }).catch(() => null);
    if (!res || !res.ok) {
      set({ notifications: prev, unreadCount: prev.filter((n) => !n.readAt).length });
      toast.error("Failed to mark all notifications as read");
    }
  },

  _ingest: (n: INotification, silent = false) => {
    set((state) => ({
      notifications: [n, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + (n.readAt ? 0 : 1),
    }));
    if (!silent && !n.readAt) {
      playNotificationSound();
      const emoji = TOAST_EMOJI[n.type] ?? "🔔";
      const body = n.message ? n.message.slice(0, 100) : n.title;
      toast(body, {
        icon: emoji,
        duration: 5000,
        style: { maxWidth: "380px", fontSize: "13px" },
      });
    }
  },

  reset: () => {
    if (_eventSource) {
      _eventSource.close();
      _eventSource = null;
    }
    _visibilityCleanup?.();
    _visibilityCleanup = null;
    set({ notifications: [], unreadCount: 0, hydrated: false, sseConnected: false });
  },
}));
