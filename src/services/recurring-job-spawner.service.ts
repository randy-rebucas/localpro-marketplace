import { jobRepository } from "@/repositories/job.repository";
import { recurringScheduleRepository } from "@/repositories/recurringSchedule.repository";
import { userRepository } from "@/repositories/user.repository";
import { activityRepository } from "@/repositories/activity.repository";
import { notificationRepository } from "@/repositories/notification.repository";
import { messageFormatterService } from "./message-formatter.service";
import type { IJob, IRecurringSchedule } from "@/types";
import { pushNotification } from "@/lib/events";
import { sendNotificationEmail } from "@/lib/email";
import mongoose from "mongoose";

interface SpawnedJobResult {
  jobId: string;
  recurringScheduleId: string;
  providerId?: string;
  status: "spawned" | "assigned";
  message: string;
}

/**
 * RecurringJobSpawnerService - Automatically spawn jobs from recurring templates
 * - Spawns jobs on scheduled dates (weekly, monthly)
 * - Locks to preferred provider on first completion
 * - Auto-calculates next run date based on frequency
 * - Notifies client of new spawned job
 * - Tracks total runs and enforces max run limits
 */
class RecurringJobSpawnerService {
  private readonly ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  private readonly ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000; // Simplified 30-day month

  /**
   * Find all recurring schedules due for spawning
   */
  async findDueSchedules(): Promise<any[]> {
    try {
      return await recurringScheduleRepository.findDue();
    } catch (error) {
      console.error("[RecurringJobSpawner] findDueSchedules error:", error);
      return [];
    }
  }

  /**
   * Spawn a new job from a recurring schedule
   */
  async spawnJob(
    schedule: IRecurringSchedule
  ): Promise<SpawnedJobResult | null> {
    try {
      // Check max runs limit
      if (schedule.maxRuns && schedule.totalRuns >= schedule.maxRuns) {
        // Auto-cancel schedule that has reached max runs
        await recurringScheduleRepository.cancel(schedule._id?.toString() || "");

        return {
          jobId: "",
          recurringScheduleId: schedule._id?.toString() || "",
          status: "spawned",
          message: `Schedule reached max runs (${schedule.maxRuns}), automatically cancelled`,
        };
      }

      // Create new job from schedule template
      const newJob: Partial<IJob> = {
        clientId: schedule.clientId,
        providerId: schedule.providerId || undefined,
        category: schedule.category,
        title: schedule.title,
        description: schedule.description,
        budget: schedule.budget,
        location: schedule.location,
        specialInstructions: schedule.specialInstructions,
        status: schedule.providerId ? "assigned" : "open", // Assigned if provider locked
        escrowStatus: "not_funded",
        riskScore: 0,
        fraudFlags: [],
        beforePhoto: [],
        afterPhoto: [],
      };

      // Create the job
      const createdJob = await jobRepository.create(newJob as Partial<any>);
      const jobId = createdJob._id?.toString() || "";

      // Log job spawning
      await activityRepository.log({
        userId: schedule.clientId.toString(),
        eventType: "recurring_job_spawned",
        jobId: jobId,
        metadata: {
          recurringScheduleId: schedule._id?.toString(),
          providerId: schedule.providerId?.toString(),
          totalRunsSoFar: schedule.totalRuns + 1,
          maxRuns: schedule.maxRuns,
        },
      });

      // Calculate next run date
      const nextRunAt = this.calculateNextRun(
        new Date(schedule.nextRunAt),
        schedule.frequency as "weekly" | "monthly"
      );

      // Advance schedule
      await recurringScheduleRepository.advanceNextRun(
        schedule._id?.toString() || "",
        nextRunAt
      );

      // Notify client
      await this.notifyClientJobSpawned(
        schedule.clientId.toString(),
        jobId,
        schedule.title,
        schedule.budget
      );

      // If provider assigned, notify them too
      if (schedule.providerId) {
        await this.notifyProviderJobAssigned(
          schedule.providerId.toString(),
          jobId,
          schedule.title,
          schedule.budget
        );
      }

      return {
        jobId,
        recurringScheduleId: schedule._id?.toString() || "",
        providerId: schedule.providerId?.toString(),
        status: schedule.providerId ? "assigned" : "spawned",
        message: schedule.providerId
          ? `Job spawned and assigned to provider (run ${schedule.totalRuns + 1})`
          : `Job spawned and opened for provider matching (run ${schedule.totalRuns + 1})`,
      };
    } catch (error) {
      console.error("[RecurringJobSpawner] spawnJob error:", error);
      return null;
    }
  }

  /**
   * Calculate next run date based on frequency
   */
  private calculateNextRun(baseDate: Date, frequency: "weekly" | "monthly"): Date {
    const nextRun = new Date(baseDate);

    if (frequency === "weekly") {
      nextRun.setTime(nextRun.getTime() + this.ONE_WEEK_MS);
    } else if (frequency === "monthly") {
      nextRun.setTime(nextRun.getTime() + this.ONE_MONTH_MS);
    }

    return nextRun;
  }

  /**
   * Mark schedule as completed for this week (set next run)
   * Called after job completes successfully
   */
  async markScheduleRunComplete(scheduleId: string): Promise<void> {
    try {
      const schedule = await recurringScheduleRepository.findById(scheduleId);
      if (!schedule) return;

      const nextRunAt = this.calculateNextRun(
        new Date(),
        schedule.frequency as "weekly" | "monthly"
      );

      await recurringScheduleRepository.advanceNextRun(scheduleId, nextRunAt);
    } catch (error) {
      console.error("[RecurringJobSpawner] markScheduleRunComplete error:", error);
    }
  }

  /**
   * Get analytics on schedule performance
   */
  async generateScheduleReport(
    clientId: string
  ): Promise<{
    totalSchedules: number;
    activeSchedules: number;
    totalJobsSpawned: number;
    upcomingSpawns: number;
  }> {
    try {
      const schedules = await recurringScheduleRepository.findByClient(clientId);

      const active = schedules.filter((s) => s.status === "active");
      const totalSpawned = schedules.reduce((sum, s) => sum + (s.totalRuns || 0), 0);
      const upcoming = active.filter((s) => new Date(s.nextRunAt) > new Date()).length;

      return {
        totalSchedules: schedules.length,
        activeSchedules: active.length,
        totalJobsSpawned: totalSpawned,
        upcomingSpawns: upcoming,
      };
    } catch (error) {
      console.error("[RecurringJobSpawner] generateScheduleReport error:", error);
      return {
        totalSchedules: 0,
        activeSchedules: 0,
        totalJobsSpawned: 0,
        upcomingSpawns: 0,
      };
    }
  }

  /**
   * Notify client about spawned recurring job
   */
  private async notifyClientJobSpawned(
    clientId: string,
    jobId: string,
    jobTitle: string,
    budget: number
  ): Promise<void> {
    try {
      const client = await userRepository.findById(clientId);
      if (!client) return;

      // Format message using persona-aware formatter
      const message = messageFormatterService.formatMessage({
        scenario: "job_spawned",
        persona: "customer",
        data: {
          jobId,
          jobTitle,
          budget,
          clientName: client.name || "Valued Client",
          category: "recurring",
        },
      });

      // Push notification
      try {
        pushNotification(clientId, {
          title: message.title,
          body: message.body,
          data: message.dataPayload || { jobId, type: "recurring_job_spawned" },
        });
      } catch (err) {
        console.error("[RecurringJobSpawner] Push notification error:", err);
      }

      // Email notification
      try {
        await sendNotificationEmail(client.email, {
          type: "system_notice" as any,
          recipientName: client.name || "Client",
          title: message.title,
          message: message.body,
          data: message.dataPayload || { jobId, jobTitle },
        }).catch(() => {
          // Silently fail for email errors
        });
      } catch (err) {
        console.error("[RecurringJobSpawner] Email notification error:", err);
      }
    } catch (error) {
      console.error("[RecurringJobSpawner] notifyClientJobSpawned error:", error);
    }
  }

  /**
   * Notify provider about assigned recurring job
   */
  private async notifyProviderJobAssigned(
    providerId: string,
    jobId: string,
    jobTitle: string,
    budget: number
  ): Promise<void> {
    try {
      const provider = await userRepository.findById(providerId);
      if (!provider) return;

      // Format message using persona-aware formatter
      const message = messageFormatterService.formatMessage({
        scenario: "job_assigned",
        persona: "provider",
        data: {
          jobId,
          jobTitle,
          budget,
          providerName: provider.name || "Provider",
          clientName: "Recurring Client",
          location: "Your location",
        },
      });

      // Push notification
      try {
        pushNotification(providerId, {
          title: message.title,
          body: message.body,
          data: message.dataPayload || {
            jobId,
            type: "recurring_job_assigned",
          },
        });
      } catch (err) {
        console.error("[RecurringJobSpawner] Push notification error:", err);
      }

      // Email notification
      try {
        await sendNotificationEmail(provider.email, {
          type: "system_notice" as any,
          recipientName: provider.name || "Provider",
          title: message.title,
          message: message.body,
          data: message.dataPayload || { jobId, jobTitle },
        }).catch(() => {
          // Silently fail for email errors
        });
      } catch (err) {
        console.error("[RecurringJobSpawner] Email notification error:", err);
      }
    } catch (error) {
      console.error(
        "[RecurringJobSpawner] notifyProviderJobAssigned error:",
        error
      );
    }
  }

  /**
   * Execute bulk spawning of all due recurring schedules
   * Returns summary of spawning operations
   */
  async executeBulkSpawning(): Promise<{
    totalSchedules: number;
    successfulSpawns: number;
    failedSpawns: number;
    jobsCreated: string[];
  }> {
    try {
      const dueSchedules = await this.findDueSchedules();

      const results = {
        totalSchedules: dueSchedules.length,
        successfulSpawns: 0,
        failedSpawns: 0,
        jobsCreated: [] as string[],
      };

      for (const schedule of dueSchedules) {
        const result = await this.spawnJob(schedule);
        if (result) {
          results.successfulSpawns++;
          if (result.jobId) {
            results.jobsCreated.push(result.jobId);
          }
        } else {
          results.failedSpawns++;
        }
      }

      // Log bulk spawning
      await activityRepository.log({
        userId: null as any,
        eventType: "admin_ledger_entry",
        metadata: {
          action: "bulk_recurring_spawn",
          totalSchedules: results.totalSchedules,
          successfulSpawns: results.successfulSpawns,
          failedSpawns: results.failedSpawns,
          jobsCreated: results.jobsCreated.length,
        },
      });

      return results;
    } catch (error) {
      console.error("[RecurringJobSpawner] executeBulkSpawning error:", error);
      return {
        totalSchedules: 0,
        successfulSpawns: 0,
        failedSpawns: 0,
        jobsCreated: [],
      };
    }
  }
}

export const recurringJobSpawnerService = new RecurringJobSpawnerService();
