"use client";

import { useEffect, useCallback, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { subscribePush, unsubscribePush } from "@/app/push/actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

// ─── PwaSetup ────────────────────────────────────────────────────────────────

/**
 * Registers the service worker and, for authenticated users, subscribes
 * them to web push if VAPID keys are configured and permission is granted.
 *
 * Renders nothing — this is a side-effect-only component placed in RootLayout.
 */
export default function PwaSetup() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [pendingWorker, setPendingWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const registerServiceWorker = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      // ── Update detection ──────────────────────────────────────────────────
      // If a new worker is already waiting when the page loads, show the banner.
      if (registration.waiting) {
        setPendingWorker(registration.waiting);
      }

      // Listen for a new worker installing in the background.
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && registration.waiting) {
            // New version ready and waiting — show update banner.
            setDismissed(false);
            setPendingWorker(registration.waiting);
          }
        });
      });

      // When the controller changes (new SW took over), reload all tabs.
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });

      // ── Push subscription ─────────────────────────────────────────────────
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!isAuthenticated || !("PushManager" in window) || !vapidKey) return;

      if (Notification.permission === "denied") return;

      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await subscribePush(JSON.parse(JSON.stringify(existingSub))).catch(() => {});
        return;
      }

      if (Notification.permission === "granted") {
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        await subscribePush(JSON.parse(JSON.stringify(sub))).catch(() => {});
      }
    } catch {
      // SW registration can fail in restricted environments (e.g. file://) — ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    registerServiceWorker();
  }, [registerServiceWorker]);

  function applyUpdate() {
    if (!pendingWorker) return;
    try {
      pendingWorker.postMessage({ type: "SKIP_WAITING" });
      // controllerchange listener above will reload the page
    } catch (error) {
      // Suppress "message port closed" errors — worker will self-destruct on next update
      console.debug("SW message error (ignored):", error);
    }
  }

  if (!pendingWorker || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-xl text-sm max-w-sm w-[calc(100vw-2rem)] sm:w-auto"
    >
      <RefreshCw size={16} className="flex-shrink-0 text-primary animate-spin [animation-duration:3s]" />
      <span className="flex-1 text-slate-700 dark:text-slate-200 font-medium">
        A new version is available.
      </span>
      <button
        onClick={applyUpdate}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
      >
        Reload
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss update notification"
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Hook: request push permission + subscribe ───────────────────────────────

/**
 * Call `requestPushPermission()` from a settings page or a "Enable notifications"
 * button to prompt the user and register the push subscription.
 */
export function usePushPermission() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const requestPushPermission = useCallback(async (): Promise<
    "granted" | "denied" | "unsupported" | "not_authenticated"
  > => {
    if (!isAuthenticated) return "not_authenticated";
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return "unsupported";

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const sub = existing ?? (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      }));
      await subscribePush(JSON.parse(JSON.stringify(sub)));
      return "granted";
    } catch {
      return "denied";
    }
  }, [isAuthenticated]);

  const revokePushPermission = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (!sub) return;
      await sub.unsubscribe();
      await unsubscribePush(sub.endpoint);
    } catch {
      // ignore
    }
  }, []);

  return { requestPushPermission, revokePushPermission };
}
