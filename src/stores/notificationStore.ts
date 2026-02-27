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
import type { INotification } from "@/types";

export type { INotification as Notification };

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

  /** Prepend an incoming SSE notification */
  _ingest: (n: INotification) => void;

  /** Clear all state and close SSE — call on logout */
  reset: () => void;
}

let _eventSource: EventSource | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  hydrated: false,
  sseConnected: false,

  // ─── Hydrate ──────────────────────────────────────────────────────────────

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
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

    _eventSource = new EventSource("/api/notifications/stream", {
      withCredentials: true,
    });

    _eventSource.onopen = () => set({ sseConnected: true });

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
      // Browser will auto-reconnect on network errors
      set({ sseConnected: false });
    };
  },

  disconnectSSE: () => {
    if (_eventSource) {
      _eventSource.close();
      _eventSource = null;
    }
    set({ sseConnected: false });
  },

  // ─── Mutations ────────────────────────────────────────────────────────────

  markRead: async (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n._id?.toString() === id ? { ...n, readAt: new Date() } : n
      ),
      unreadCount: Math.max(
        0,
        state.notifications.filter((n) => !n.readAt && n._id?.toString() !== id).length
      ),
    }));
    await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      credentials: "include",
    }).catch(() => {});
  },

  markAllRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })),
      unreadCount: 0,
    }));
    await fetch("/api/notifications", {
      method: "PATCH",
      credentials: "include",
    }).catch(() => {});
  },

  _ingest: (n: INotification) =>
    set((state) => ({
      notifications: [n, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + (n.readAt ? 0 : 1),
    })),

  reset: () => {
    if (_eventSource) {
      _eventSource.close();
      _eventSource = null;
    }
    set({ notifications: [], unreadCount: 0, hydrated: false, sseConnected: false });
  },
}));
