/**
 * In-process event bus for Server-Sent Events (SSE).
 *
 * Works for single-instance (Node.js / Docker) deployments.
 * For multi-instance production, replace with a Redis pub/sub adapter.
 */
import { EventEmitter } from "events";

class SSEBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(10_000);
  }
}

/** Emit and subscribe to user-scoped notification events. */
export const notificationBus = new SSEBus();

/** Emit and subscribe to job-scoped message events. */
export const messageBus = new SSEBus();

/** Push a notification to a specific user's SSE stream. */
export function pushNotification(userId: string, payload: unknown): void {
  notificationBus.emit(`notification:${userId}`, payload);
}

/** Push a message to a job thread's SSE stream. */
export function pushMessage(threadId: string, payload: unknown): void {
  messageBus.emit(`message:${threadId}`, payload);
}

/** Shape of a real-time status-update event multiplexed on the notification SSE stream. */
export interface StatusUpdatePayload {
  __event: "status_update";
  entity: "job" | "quote" | "dispute" | "transaction";
  id: string;
  status?: string;
  escrowStatus?: string;
}

/** Push a status-update event to a single user's SSE stream. */
export function pushStatusUpdate(
  userId: string,
  payload: Omit<StatusUpdatePayload, "__event">
): void {
  notificationBus.emit(`notification:${userId}`, { ...payload, __event: "status_update" });
}

/** Push a status-update event to multiple users at once. */
export function pushStatusUpdateMany(
  userIds: string[],
  payload: Omit<StatusUpdatePayload, "__event">
): void {
  for (const userId of userIds) pushStatusUpdate(userId, payload);
}

// ─── Support Channel ──────────────────────────────────────────────────────────

/** Emit and subscribe to support-chat events. */
export const supportBus = new SSEBus();

/**
 * Push a support message to a specific user's support stream.
 * Used when an admin replies so the user sees it immediately.
 */
export function pushSupportToUser(userId: string, payload: unknown): void {
  supportBus.emit(`support:${userId}`, payload);
}

/**
 * Push a support message to the admin-wide support stream.
 * Used when a user sends a message so all logged-in admins see it.
 */
export function pushSupportToAdmin(payload: unknown): void {
  supportBus.emit("support:admin", payload);
}
