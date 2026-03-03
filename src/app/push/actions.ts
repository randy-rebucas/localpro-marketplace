"use server";

import webpush from "web-push";
import { requireUser } from "@/lib/auth";
import { userRepository } from "@/repositories";
import type { PushSubscriptionRecord } from "@/models/User";

// Initialise VAPID credentials once at module load.
// Missing keys → push silently disabled (dev without .env).
if (
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_SUBJECT ?? "admin@localpro.ph"}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ─── Subscribe ───────────────────────────────────────────────────────────────

export async function subscribePush(sub: PushSubscriptionRecord) {
  const user = await requireUser();
  await userRepository.upsertPushSubscription(user.userId, sub);
  return { success: true };
}

// ─── Unsubscribe ──────────────────────────────────────────────────────────────

export async function unsubscribePush(endpoint: string) {
  const user = await requireUser();
  await userRepository.removePushSubscription(user.userId, endpoint);
  return { success: true };
}

// ─── Send a web-push notification to a specific user (server-side helper) ────
// Used by notificationService or admin tooling — not called from the browser.

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; icon?: string; tag?: string }
) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return; // VAPID not configured
  }

  const subscriptions = await userRepository.getPushSubscriptions(userId);
  if (!subscriptions.length) return;

  const message = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          expirationTime: sub.expirationTime ?? null,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        },
        message
      ).catch(async (err: { statusCode?: number }) => {
        // 404 / 410 → subscription expired, clean it up
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await userRepository.removePushSubscription(userId, sub.endpoint).catch(() => {});
        }
      })
    )
  );
}
