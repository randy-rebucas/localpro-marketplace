import NotificationQueue from "@/models/NotificationQueue";

/**
 * Compute the next digest time for a user.
 * Default strategy: next hour mark (e.g., if it's 10:23, schedule for 11:00).
 */
function getNextDigestTime(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

/**
 * Enqueue a notification for batched/digest delivery.
 *
 * When `immediate` is true the notification is scheduled for right now
 * (it will be picked up by the next digest cron run).
 * Otherwise it is deferred to the next hour mark.
 */
export async function enqueueNotification(params: {
  userId: string;
  channel: "email" | "push";
  category: string;
  subject: string;
  body: string;
  immediate?: boolean;
}): Promise<void> {
  const scheduledFor = params.immediate ? new Date() : getNextDigestTime();

  await NotificationQueue.create({
    userId: params.userId,
    channel: params.channel,
    category: params.category,
    subject: params.subject,
    body: params.body,
    scheduledFor,
  });
}
