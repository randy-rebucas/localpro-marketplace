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
