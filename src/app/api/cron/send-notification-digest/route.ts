import { type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import { createLogger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { sendPushToUser } from "@/app/push/actions";
import NotificationQueue from "@/models/NotificationQueue";
import User from "@/models/User";
import { randomUUID } from "crypto";

const log = createLogger("cron:notification-digest");

/**
 * GET /api/cron/send-notification-digest
 *
 * Processes the notification queue:
 *  1. Find all unsent notifications where scheduledFor <= now
 *  2. Group by userId + channel
 *  3. For email: combine into a single digest email
 *  4. For push: send individual push notifications
 *  5. Mark as sent with a batchId
 *
 * Runs periodically via Vercel Cron (e.g. every 15 minutes or every hour).
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  let emailBatches = 0;
  let pushSent = 0;

  try {
    // Find all unsent notifications that are due
    const pendingGroups = await NotificationQueue.aggregate([
      {
        $match: {
          sentAt: null,
          scheduledFor: { $lte: now },
        },
      },
      {
        $sort: { createdAt: 1 },
      },
      {
        $group: {
          _id: { userId: "$userId", channel: "$channel" },
          notifications: {
            $push: {
              _id: "$_id",
              subject: "$subject",
              body: "$body",
              category: "$category",
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    for (const group of pendingGroups) {
      const { userId, channel } = group._id as { userId: string; channel: string };
      const notifications = group.notifications as Array<{
        _id: string;
        subject: string;
        body: string;
        category: string;
      }>;
      const notificationIds = notifications.map((n) => n._id);
      const batchId = randomUUID();

      try {
        if (channel === "email") {
          // Look up user email
          const user = await User.findById(userId).select("email name").lean();
          if (!user || !(user as { email?: string }).email) {
            log.warn({ userId }, "Skipping email digest — user not found or no email");
            continue;
          }

          const { email, name } = user as { email: string; name: string };

          // Build digest email HTML
          const itemsHtml = notifications
            .map(
              (n) =>
                `<tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0">
                    <strong style="color:#0f172a;font-size:14px">${escHtml(n.subject)}</strong>
                    <p style="color:#475569;font-size:13px;margin:4px 0 0;line-height:1.5">${escHtml(n.body)}</p>
                  </td>
                </tr>`
            )
            .join("");

          const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <tr>
          <td style="background:#1e3a5f;padding:24px 32px">
            <span style="color:#fff;font-size:20px;font-weight:700">LocalPro</span>
            <span style="color:#93c5fd;font-size:13px;margin-left:8px">Notification Digest</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px">Hi ${escHtml(name)},</h2>
            <p style="color:#475569;font-size:15px;margin:0 0 24px">You have ${notifications.length} notification${notifications.length > 1 ? "s" : ""} to catch up on:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
              ${itemsHtml}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
            <p style="margin:0;color:#64748b;font-size:12px">You received this digest because you have an account on LocalPro.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

          const subject =
            notifications.length === 1
              ? notifications[0].subject
              : `You have ${notifications.length} new notifications`;

          await sendEmail(email, subject, html);
          emailBatches++;
        } else if (channel === "push") {
          // Send individual push notifications
          for (const n of notifications) {
            await sendPushToUser(userId, {
              title: n.subject,
              body: n.body,
            }).catch((err: unknown) =>
              log.error({ err, userId }, "Failed to send queued push notification")
            );
            pushSent++;
          }
        }

        // Mark all notifications in this batch as sent
        await NotificationQueue.updateMany(
          { _id: { $in: notificationIds } },
          { sentAt: now, batchId }
        );
      } catch (err) {
        log.error({ err, userId, channel }, "Failed to process notification digest batch");
      }
    }

    log.info({ emailBatches, pushSent }, "Notification digest cron completed");

    return Response.json({
      ok: true,
      emailBatches,
      pushSent,
    });
  } catch (err) {
    log.error({ err }, "Fatal error in notification digest cron");
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

/** Encode a string so it is safe to embed inside HTML. */
function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
