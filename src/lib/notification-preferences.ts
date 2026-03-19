import NotificationPreference from "@/models/NotificationPreference";

/**
 * Check whether a notification should be sent to a user on a given channel/category.
 * Returns `true` (send) when no preference record exists (opt-out model).
 */
export async function shouldNotify(
  userId: string,
  channel: string,
  category: string
): Promise<boolean> {
  const pref = await NotificationPreference.findOne({ userId, channel, category }).lean();
  return pref ? (pref as { enabled: boolean }).enabled : true;
}
