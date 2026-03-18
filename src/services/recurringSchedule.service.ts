import { recurringScheduleRepository, activityRepository } from "@/repositories";
import { jobRepository } from "@/repositories";
import { ForbiddenError, NotFoundError, UnprocessableError } from "@/lib/errors";
import { hasBulkAndRecurringAccess, PLAN_LABELS } from "@/lib/businessPlan";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import type { TokenPayload } from "@/lib/auth";
import type { RecurringFrequency } from "@/types";
import { RECURRING_CATEGORIES } from "@/types";
import { businessOrganizationRepository } from "@/repositories/businessOrganization.repository";

export interface CreateRecurringInput {
  title: string;
  category: string;
  description: string;
  budget: number;
  location: string;
  frequency: RecurringFrequency;
  scheduleDate: string; // ISO date — first occurrence
  autoPayEnabled?: boolean;
  specialInstructions?: string;
  maxRuns?: number;
  providerId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextOccurrence(from: Date, frequency: RecurringFrequency): Date {
  const next = new Date(from);
  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

function nearestFutureOccurrence(frequency: RecurringFrequency): Date {
  return nextOccurrence(new Date(), frequency);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class RecurringScheduleService {
  async create(user: TokenPayload, input: CreateRecurringInput) {
    if (user.role !== "client") throw new ForbiddenError();

    // ── Plan feature gate: Recurring scheduler requires Pro or Enterprise ────────────
    const org = await businessOrganizationRepository.findByOwner(user.userId);
    if (!org || !hasBulkAndRecurringAccess(org.plan)) {
      throw new ForbiddenError(
        `Recurring job scheduling is available on the Pro and Enterprise plans. Your current plan is ${org ? PLAN_LABELS[org.plan] : "Free"}. Upgrade your plan to use this feature.`
      );
    }

    // Soft-validate category (warn but don't block — future categories may expand)
    const eligible = (RECURRING_CATEGORIES as readonly string[]).map((c) =>
      c.toLowerCase()
    );
    if (!eligible.includes(input.category.toLowerCase())) {
      throw new UnprocessableError(
        `Recurring bookings are only available for: ${RECURRING_CATEGORIES.join(", ")}`
      );
    }

    const firstRun = new Date(input.scheduleDate);
    if (isNaN(firstRun.getTime())) {
      throw new UnprocessableError("Invalid schedule date");
    }
    if (firstRun < new Date()) {
      throw new UnprocessableError("Schedule date must be in the future");
    }

    const schedule = await recurringScheduleRepository.create({
      clientId: user.userId,
      providerId: input.providerId ?? null,
      category: input.category,
      title: input.title,
      description: input.description,
      budget: input.budget,
      location: input.location,
      frequency: input.frequency,
      autoPayEnabled: input.autoPayEnabled ?? false,
      specialInstructions: input.specialInstructions ?? "",
      nextRunAt: firstRun,
      maxRuns: input.maxRuns ?? null,
      status: "active",
    });

    await activityRepository.log({
      userId: user.userId,
      eventType: "recurring_created",
      metadata: {
        scheduleId: schedule._id!.toString(),
        frequency: input.frequency,
        category: input.category,
      },
    });

    return schedule;
  }

  async list(user: TokenPayload) {
    if (user.role !== "client") throw new ForbiddenError();
    return recurringScheduleRepository.findByClient(user.userId);
  }

  async getById(user: TokenPayload, id: string) {
    const schedule = await recurringScheduleRepository.findById(id);
    if (!schedule) throw new NotFoundError("Recurring schedule");
    if (schedule.clientId.toString() !== user.userId) throw new ForbiddenError();
    return schedule;
  }

  async update(
    user: TokenPayload,
    id: string,
    input: Partial<{
      title: string;
      description: string;
      budget: number;
      location: string;
      specialInstructions: string;
      maxRuns: number | null;
      autoPayEnabled: boolean;
      providerId: string | null;
    }>
  ) {
    const schedule = await recurringScheduleRepository.findById(id);
    if (!schedule) throw new NotFoundError("Recurring schedule");
    if (schedule.clientId.toString() !== user.userId) throw new ForbiddenError();
    if (schedule.status === "cancelled") throw new UnprocessableError("Cannot edit a cancelled schedule");
    return recurringScheduleRepository.update(id, input);
  }

  async pause(user: TokenPayload, id: string) {
    const schedule = await recurringScheduleRepository.findById(id);
    if (!schedule) throw new NotFoundError("Recurring schedule");
    if (schedule.clientId.toString() !== user.userId) throw new ForbiddenError();
    if (schedule.status !== "active") {
      throw new UnprocessableError("Only active schedules can be paused");
    }
    return recurringScheduleRepository.pause(id);
  }

  async resume(user: TokenPayload, id: string) {
    const schedule = await recurringScheduleRepository.findById(id);
    if (!schedule) throw new NotFoundError("Recurring schedule");
    if (schedule.clientId.toString() !== user.userId) throw new ForbiddenError();
    if (schedule.status !== "paused") {
      throw new UnprocessableError("Only paused schedules can be resumed");
    }

    // Advance from the schedule's last known nextRunAt so that the cadence
    // (day-of-week for weekly, day-of-month for monthly) is preserved.
    const baseDate = schedule.nextRunAt ? new Date(schedule.nextRunAt) : new Date();
    const nextRunAt = nextOccurrence(baseDate, schedule.frequency as RecurringFrequency);
    // If the computed next run is in the past, keep advancing until it's future.
    let advance = nextRunAt;
    const now = new Date();
    while (advance <= now) {
      advance = nextOccurrence(advance, schedule.frequency as RecurringFrequency);
    }
    return recurringScheduleRepository.resume(id, advance);
  }

  async cancel(user: TokenPayload, id: string) {
    const schedule = await recurringScheduleRepository.findById(id);
    if (!schedule) throw new NotFoundError("Recurring schedule");
    if (schedule.clientId.toString() !== user.userId) throw new ForbiddenError();
    if (schedule.status === "cancelled") {
      throw new UnprocessableError("Schedule is already cancelled");
    }
    const updated = await recurringScheduleRepository.cancel(id);

    await activityRepository.log({
      userId: user.userId,
      eventType: "recurring_cancelled",
      metadata: { scheduleId: id },
    });

    return updated;
  }

  /**
   * Spawns jobs for all active recurring schedules that are now due.
   * Called by the cron job at `/api/cron/spawn-recurring`.
   */
  async spawnDue(): Promise<{ spawned: number; errors: string[] }> {
    const due = await recurringScheduleRepository.findDue();
    let spawned = 0;
    const errors: string[] = [];

    for (const schedule of due) {
      try {
        const clientId = schedule.clientId.toString();
        const scheduleRunAt = new Date(schedule.nextRunAt);
        const nextRunAt = nextOccurrence(
          scheduleRunAt,
          schedule.frequency as RecurringFrequency
        );

        // ── Idempotency guard: skip if a job was already spawned for this
        //    schedule+date window (prevents double-spawn on cron restart / overlap) ──
        await connectDB();
        const Job = (await import("@/models/Job")).default;
        // Use a 6-hour window around the scheduled run time
        const windowStart = new Date(scheduleRunAt.getTime() - 6 * 60 * 60 * 1000);
        const windowEnd   = new Date(scheduleRunAt.getTime() + 6 * 60 * 60 * 1000);
        const existingJob = await Job.exists({
          recurringScheduleId: schedule._id,
          scheduleDate: { $gte: windowStart, $lte: windowEnd },
        });
        if (existingJob) {
          // Already spawned (e.g. by a concurrent cron replica) — advance schedule and continue
          await recurringScheduleRepository.advanceNextRun(schedule._id!.toString(), nextRunAt);
          continue;
        }

        // Create the job directly (skip the daily-limit check — cron bypasses it)
        const job = await jobRepository.create({
          clientId,
          providerId: schedule.providerId ?? null,
          category: schedule.category,
          title: schedule.title,
          description: schedule.description,
          budget: schedule.budget,
          location: schedule.location,
          scheduleDate: scheduleRunAt,
          specialInstructions: [
            schedule.specialInstructions,
            `[Auto-scheduled — ${schedule.frequency} recurring]`,
          ]
            .filter(Boolean)
            .join("\n"),
          status: "pending_validation",
          escrowStatus: "not_funded",
          riskScore: 0,
          fraudFlags: [],
          beforePhoto: [],
          afterPhoto: [],
          milestones: [],
          recurringScheduleId: schedule._id,
        });

        // Advance the schedule to the next occurrence
        const willComplete =
          schedule.maxRuns != null &&
          schedule.totalRuns + 1 >= schedule.maxRuns;

        await recurringScheduleRepository.advanceNextRun(
          schedule._id!.toString(),
          nextRunAt
        );

        if (willComplete) {
          await recurringScheduleRepository.cancel(schedule._id!.toString());
        }

        // Notify client
        const { getNotificationT } = await import(
          "@/services/notification.service"
        );
        const t = await getNotificationT(clientId);
        const { notificationRepository } = await import("@/repositories");
        await notificationRepository.create({
          userId: clientId,
          type: "recurring_job_spawned",
          title: t("recurringJobPostedTitle"),
          message: t("recurringJobPostedMessage", { jobTitle: schedule.title, date: new Date(schedule.nextRunAt).toLocaleDateString() }),
          data: { jobId: job._id!.toString() },
        });

        // ── Auto-pay: only attempt once admin validates the job (H11).
        //    When the job is approved, its status moves to "open" (or "assigned"
        //    if a provider is already pinned). The admin approval route at
        //    /api/admin/jobs/[id]/approve calls paymentService.autoChargeEscrow
        //    directly with the schedule's savedPaymentMethodId.
        //    At spawn time, we simply notify the client and leave funding to the
        //    post-validation webhook/cron.
        if (schedule.autoPayEnabled) {
          await notificationRepository.create({
            userId: clientId,
            type: "payment_reminder",
            title: t("recurringJobPendingTitle"),
            message: t("recurringJobPendingMessage", { jobTitle: schedule.title }),
            data: { jobId: job._id!.toString() },
          });
        } else {
          // Manual fund notification
          await notificationRepository.create({
            userId: clientId,
            type: "payment_reminder",
            title: t("fundEscrowRecurringTitle"),
            message: t("fundEscrowRecurringMessage", { amount: schedule.budget.toLocaleString(), jobTitle: schedule.title }),
            data: { jobId: job._id!.toString() },
          });
        }

        await activityRepository.log({
          userId: "system",
          eventType: "recurring_job_spawned",
          jobId: job._id!.toString(),
          metadata: { scheduleId: schedule._id!.toString() },
        });

        // Notify admins so they can validate the recurring job
        const { notificationService: adminNotif } = await import(
          "@/services/notification.service"
        );
        await adminNotif.notifyAdmins(
          "job_submitted",
          "Recurring job pending review",
          `"${schedule.title}" (${schedule.frequency} recurring) was auto-posted for ${new Date(schedule.nextRunAt).toLocaleDateString()} and needs validation.`,
          { jobId: job._id!.toString() }
        );

        spawned++;
      } catch (err) {
        errors.push(
          `Schedule ${schedule._id}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return { spawned, errors };
  }
}

export const recurringScheduleService = new RecurringScheduleService();
