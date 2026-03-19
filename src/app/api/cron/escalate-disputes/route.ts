import { type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import { createLogger } from "@/lib/logger";
import Dispute from "@/models/Dispute";
import { notificationService } from "@/services/notification.service";

const log = createLogger("cron:escalate-disputes");

/**
 * GET /api/cron/escalate-disputes
 *
 * Auto-escalation timer for disputes:
 *   Level 1 (0-48h):  Between parties ("provider" — default)
 *   Level 2 (48h+):   Escalate to admin
 *   Level 3 (96h+):   Escalate to PESO
 *
 * Runs periodically via Vercel Cron.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const hours48Ago = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const hours96Ago = new Date(now.getTime() - 96 * 60 * 60 * 1000);

  let escalatedToAdmin = 0;
  let escalatedToPeso = 0;

  try {
    // ── Escalate provider → admin (disputes open/investigating > 48h at provider level) ──
    const adminCandidates = await Dispute.find({
      status: { $in: ["open", "investigating"] },
      disputeEscalationLevel: "provider",
      createdAt: { $lt: hours48Ago },
    })
      .populate("jobId", "title clientId providerId")
      .lean();

    for (const dispute of adminCandidates) {
      const d = dispute as unknown as {
        _id: { toString(): string };
        raisedBy: { toString(): string };
        reason: string;
        jobId: {
          _id: { toString(): string };
          title: string;
          clientId: { toString(): string };
          providerId?: { toString(): string } | null;
        } | null;
      };

      try {
        await Dispute.findByIdAndUpdate(d._id, {
          disputeEscalationLevel: "admin",
          disputeEscalatedAt: now,
          status: "investigating",
          wasEscalated: true,
        });

        const jobTitle = d.jobId?.title ?? "Unknown job";
        const disputeId = d._id.toString();

        // Notify admins
        await notificationService.notifyAdmins(
          "dispute_opened",
          "Dispute escalated to admin",
          `Dispute for "${jobTitle}" has been auto-escalated to admin review after 48 hours without resolution.`,
          { jobId: d.jobId?._id.toString(), disputeId }
        );

        // Notify the parties involved
        const partyIds = [
          d.jobId?.clientId?.toString(),
          d.jobId?.providerId?.toString(),
        ].filter(Boolean) as string[];

        for (const partyId of partyIds) {
          await notificationService.push({
            userId: partyId,
            type: "dispute_opened",
            title: "Dispute escalated to admin",
            message: `Your dispute for "${jobTitle}" has been escalated to admin review for faster resolution.`,
            data: { jobId: d.jobId?._id.toString(), disputeId },
          });
        }

        escalatedToAdmin++;
        log.info({ disputeId }, "Dispute escalated from provider to admin");
      } catch (err) {
        log.error({ err, disputeId: d._id.toString() }, "Failed to escalate dispute to admin");
      }
    }

    // ── Escalate admin → PESO (disputes at admin level > 96h since creation) ──
    const pesoCandidates = await Dispute.find({
      status: { $in: ["open", "investigating"] },
      disputeEscalationLevel: "admin",
      createdAt: { $lt: hours96Ago },
    })
      .populate("jobId", "title clientId providerId")
      .lean();

    for (const dispute of pesoCandidates) {
      const d = dispute as unknown as {
        _id: { toString(): string };
        raisedBy: { toString(): string };
        reason: string;
        jobId: {
          _id: { toString(): string };
          title: string;
          clientId: { toString(): string };
          providerId?: { toString(): string } | null;
        } | null;
      };

      try {
        await Dispute.findByIdAndUpdate(d._id, {
          disputeEscalationLevel: "peso",
          disputeEscalatedAt: now,
        });

        const jobTitle = d.jobId?.title ?? "Unknown job";
        const disputeId = d._id.toString();

        // Notify admins about PESO escalation
        await notificationService.notifyAdmins(
          "dispute_opened",
          "Dispute escalated to PESO",
          `Dispute for "${jobTitle}" has been auto-escalated to PESO after 96 hours without resolution.`,
          { jobId: d.jobId?._id.toString(), disputeId }
        );

        // Notify the parties involved
        const partyIds = [
          d.jobId?.clientId?.toString(),
          d.jobId?.providerId?.toString(),
        ].filter(Boolean) as string[];

        for (const partyId of partyIds) {
          await notificationService.push({
            userId: partyId,
            type: "dispute_opened",
            title: "Dispute escalated to PESO",
            message: `Your dispute for "${jobTitle}" has been escalated to PESO for mediation.`,
            data: { jobId: d.jobId?._id.toString(), disputeId },
          });
        }

        escalatedToPeso++;
        log.info({ disputeId }, "Dispute escalated from admin to PESO");
      } catch (err) {
        log.error({ err, disputeId: d._id.toString() }, "Failed to escalate dispute to PESO");
      }
    }

    log.info(
      { escalatedToAdmin, escalatedToPeso },
      "Dispute escalation cron completed"
    );

    return Response.json({
      ok: true,
      escalatedToAdmin,
      escalatedToPeso,
    });
  } catch (err) {
    log.error({ err }, "Fatal error in dispute escalation cron");
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
