import {
  jobRepository,
  transactionRepository,
  disputeRepository,
  userRepository,
  activityRepository,
  notificationRepository,
} from "@/repositories";
import { pushNotification } from "@/lib/events";
import { NotFoundError, UnprocessableError } from "@/lib/errors";
import type { JobStatus, AdminStats } from "@/types";

export interface UpdateUserInput {
  isVerified?: boolean;
  isSuspended?: boolean;
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
      title: string;
      _id: { toString(): string };
      save(): Promise<void>;
    };
    if (j.status !== "pending_validation") {
      throw new UnprocessableError("Only jobs pending validation can be approved");
    }

    j.status = "open";
    if (riskScore !== undefined) j.riskScore = riskScore;
    await jobDoc.save();

    await activityRepository.log({
      userId: adminUserId,
      eventType: "job_approved",
      jobId,
      metadata: { riskScore: j.riskScore },
    });

    // Notify client
    const notification = await notificationRepository.create({
      userId: j.clientId.toString(),
      type: "job_approved",
      title: "Your job has been approved!",
      message: `"${j.title}" is now live and accepting quotes from providers.`,
      data: { jobId },
    });
    pushNotification(j.clientId.toString(), notification);

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
    const notification = await notificationRepository.create({
      userId: j.clientId.toString(),
      type: "job_rejected",
      title: "Job not approved",
      message: `"${j.title}" was not approved. Please review our guidelines and resubmit.`,
      data: { jobId },
    });
    pushNotification(j.clientId.toString(), notification);

    return jobDoc;
  }

  async listUsers(filter: Record<string, unknown> = {}) {
    return userRepository.findAll(filter);
  }

  async updateUser(adminUserId: string, userId: string, updates: UpdateUserInput) {
    const user = await userRepository.updateUser(userId, updates);
    if (!user) throw new NotFoundError("User");
    return user;
  }

  async getUser(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");
    return user;
  }
}

export const adminService = new AdminService();
