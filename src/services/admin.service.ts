import {
  jobRepository,
  transactionRepository,
  disputeRepository,
  userRepository,
  activityRepository,
  notificationRepository,
} from "@/repositories";
import { pushNotification, pushStatusUpdate } from "@/lib/events";
import { NotFoundError, UnprocessableError } from "@/lib/errors";
import { sendBusinessJobInviteEmail } from "@/lib/email";
import type { JobStatus, AdminStats } from "@/types";

export interface UpdateUserInput {
  isVerified?: boolean;
  isSuspended?: boolean;
  approvalStatus?: "pending_approval" | "approved" | "rejected";
}

export class AdminService {
  async getStats(): Promise<AdminStats> {
    const [jobStatusCounts, fundedJobs, completedTxns, openDisputes] =
      await Promise.all([
        jobRepository.countByStatus(),
        jobRepository.findFundedEscrow(),
        transactionRepository.findCompleted(),
        disputeRepository.countOpen(),
      ]);

    const jobsByStatus = Object.fromEntries(
      jobStatusCounts.map((s) => [s._id, s.count])
    ) as Record<JobStatus, number>;

    const totalGMV = completedTxns.reduce((s, t) => s + t.amount, 0);
    const totalCommission = completedTxns.reduce((s, t) => s + t.commission, 0);
    const escrowBalance = fundedJobs.reduce((s, j) => s + j.budget, 0);
    const activeJobs =
      (jobsByStatus.open ?? 0) +
      (jobsByStatus.assigned ?? 0) +
      (jobsByStatus.in_progress ?? 0);

    return { totalGMV, totalCommission, activeJobs, escrowBalance, openDisputes, jobsByStatus };
  }

  async approveJob(adminUserId: string, jobId: string, riskScore?: number) {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const j = jobDoc as unknown as {
      status: string;
      riskScore: number;
      clientId: { toString(): string };
      providerId: unknown;
      title: string;
      _id: { toString(): string };
      invitedProviderId?: { toString(): string } | null;
      save(): Promise<void>;
    };
    if (j.status !== "pending_validation") {
      throw new UnprocessableError("Only jobs pending validation can be approved");
    }

    // Direct invite: skip open marketplace and assign to the invited provider
    if (j.invitedProviderId) {
      j.status = "assigned";
      j.providerId = j.invitedProviderId;
    } else {
      j.status = "open";
    }
    if (riskScore !== undefined) j.riskScore = riskScore;
    await jobDoc.save();

    await activityRepository.log({
      userId: adminUserId,
      eventType: "job_approved",
      jobId,
      metadata: { riskScore: j.riskScore, direct: !!j.invitedProviderId },
    });

    // Notify client
    const { getNotificationT } = await import("@/services/notification.service");
    const tClient = await getNotificationT(j.clientId.toString());
    const statusLabel = j.invitedProviderId ? tClient("jobApprovedStatusAssigned") : tClient("jobApprovedStatusLive");
    const notification = await notificationRepository.create({
      userId: j.clientId.toString(),
      type: "job_approved",
      title: tClient("jobApprovedTitle"),
      message: tClient("jobApprovedMessage", { jobTitle: j.title, statusLabel }),
      data: { jobId },
    });
    pushNotification(j.clientId.toString(), notification);
    pushStatusUpdate(j.clientId.toString(), {
      entity: "job",
      id: jobId,
      status: j.invitedProviderId ? "assigned" : "open",
    });

    // Notify invited provider about the direct job
    if (j.invitedProviderId) {
      const tProvider = await getNotificationT(j.invitedProviderId.toString());
      const providerNotif = await notificationRepository.create({
        userId: j.invitedProviderId.toString(),
        type: "job_direct_invite",
        title: tProvider("jobDirectInviteTitle"),
        message: tProvider("jobDirectInviteMessage", { jobTitle: j.title }),
        data: { jobId },
      });
      pushNotification(j.invitedProviderId.toString(), providerNotif);
    }

    // ── Business preferred provider routing ───────────────────────────────────
    // If the client belongs to a business org with preferred providers and the
    // job went to open marketplace (not a direct invite), notify all preferred
    // providers so they get first visibility on the new job.
    if (!j.invitedProviderId) {
      try {
        const BusinessOrganization = (await import("@/models/BusinessOrganization")).default;
        const User = (await import("@/models/User")).default;

        const org = await BusinessOrganization.findOne(
          { ownerId: j.clientId.toString() },
          "name locations"
        ).lean();

        if (org) {
          // Collect all unique preferred provider IDs across all locations
          const preferredIds = [
            ...new Set(
              org.locations
                .flatMap((loc: { preferredProviderIds?: unknown[] }) =>
                  (loc.preferredProviderIds ?? []).map(String)
                )
            ),
          ] as string[];

          if (preferredIds.length > 0) {
            // Look up emails for the fire-and-forget emails
            const providers = await User.find(
              { _id: { $in: preferredIds } },
              "email name"
            ).lean();

            await Promise.all(
              preferredIds.map(async (providerId) => {
                const tPref = await getNotificationT(providerId);
                const notif = await notificationRepository.create({
                  userId: providerId,
                  type: "job_direct_invite",
                  title: tPref("businessJobInviteTitle", { orgName: org.name }),
                  message: tPref("businessJobInviteMessage", { orgName: org.name, jobTitle: j.title }),
                  data: { jobId, jobTitle: j.title },
                });
                pushNotification(providerId, notif);

                const p = providers.find((u) => String(u._id) === providerId);
                if (p?.email) {
                  sendBusinessJobInviteEmail(
                    p.email,
                    p.name,
                    org.name,
                    j.title
                  ).catch((err) =>
                    console.error("[BUSINESS_ROUTING] Email failed:", err)
                  );
                }
              })
            );
          }
        }
      } catch (err) {
        // Non-critical — don't fail job approval because of this
        console.error("[BUSINESS_ROUTING] Failed to notify preferred providers:", err);
      }
    }

    return jobDoc;
  }

  async rejectJob(adminUserId: string, jobId: string) {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const j = jobDoc as unknown as {
      status: string;
      clientId: { toString(): string };
      title: string;
      save(): Promise<void>;
    };
    if (j.status !== "pending_validation") {
      throw new UnprocessableError("Only jobs pending validation can be rejected");
    }

    j.status = "rejected";
    await jobDoc.save();

    await activityRepository.log({ userId: adminUserId, eventType: "job_rejected", jobId });

    // Notify client
    const { getNotificationT } = await import("@/services/notification.service");
    const tReject = await getNotificationT(j.clientId.toString());
    const notification = await notificationRepository.create({
      userId: j.clientId.toString(),
      type: "job_rejected",
      title: tReject("jobRejectedTitle"),
      message: tReject("jobRejectedMessage", { jobTitle: j.title }),
      data: { jobId },
    });
    pushNotification(j.clientId.toString(), notification);
    pushStatusUpdate(j.clientId.toString(), { entity: "job", id: jobId, status: "rejected" });

    return jobDoc;
  }

  async listUsers(
    filter: Record<string, unknown> = {},
    page = 1,
    limit = 50
  ): Promise<{ users: unknown[]; total: number; totalPages: number }> {
    const safeLimit = Math.min(limit, 100);
    const { users, total } = await userRepository.findPaginated(filter, page, safeLimit);
    return { users, total, totalPages: Math.ceil(total / safeLimit) };
  }

  async updateUser(adminUserId: string, userId: string, updates: UpdateUserInput) {
    const user = await userRepository.updateUser(userId, updates);
    if (!user) throw new NotFoundError("User");

    // Fire approval/rejection emails when approvalStatus changes
    if (updates.approvalStatus === "approved") {
      const { sendProviderApprovedEmail } = await import("@/lib/email");
      sendProviderApprovedEmail(
        (user as { email: string }).email,
        (user as { name: string }).name
      ).catch((err) => console.error("[EMAIL] provider approved:", err));
    } else if (updates.approvalStatus === "rejected") {
      const { sendProviderRejectedEmail } = await import("@/lib/email");
      sendProviderRejectedEmail(
        (user as { email: string }).email,
        (user as { name: string }).name
      ).catch((err) => console.error("[EMAIL] provider rejected:", err));
    }

    return user;
  }

  async getUser(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");
    return user;
  }
}

export const adminService = new AdminService();
