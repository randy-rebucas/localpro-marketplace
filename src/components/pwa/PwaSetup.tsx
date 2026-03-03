"use client";

import { useEffect, useCallback } from "react";
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

  const registerServiceWorker = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      // Only attempt push subscription when:
      // 1. The user is logged in
      // 2. The browser supports push
      // 3. A VAPID public key is set
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!isAuthenticated || !("PushManager" in window) || !vapidKey) return;

      // Check current permission — do NOT prompt if already denied
      if (Notification.permission === "denied") return;

      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        // Already subscribed — sync to server in case the user cleared the DB
        await subscribePush(JSON.parse(JSON.stringify(existingSub))).catch(() => {});
        return;
      }

      // Only subscribe when the user has already granted permission
      // (we don't proactively prompt — that happens in the notification bell / settings)
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

  return null;
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
