import type { IUser } from "@/types";

export type Persona = "customer" | "admin" | "provider";
export type MessageScenario =
  | "job_spawned"
  | "job_assigned"
  | "job_started"
  | "job_completed"
  | "escrow_released"
  | "escalation_alert"
  | "fraud_alert"
  | "no_show_detected"
  | "provider_matched"
  | "payment_failed"
  | "skill_milestone";

interface MessageContext {
  scenario: MessageScenario;
  persona: Persona;
  data: Record<string, any>;
}

interface FormattedMessage {
  title: string;
  body: string;
  nextSteps?: string[];
  actionUrl?: string;
  dataPayload?: Record<string, any>;
}

class MessageFormatterService {
  /**
   * Format a message based on scenario and audience persona
   */
  formatMessage(context: MessageContext): FormattedMessage {
    const { scenario, persona, data } = context;

    switch (scenario) {
      case "job_spawned":
        return this.formatJobSpawned(persona, data);
      case "job_assigned":
        return this.formatJobAssigned(persona, data);
      case "job_started":
        return this.formatJobStarted(persona, data);
      case "job_completed":
        return this.formatJobCompleted(persona, data);
      case "escrow_released":
        return this.formatEscrowReleased(persona, data);
      case "escalation_alert":
        return this.formatEscalationAlert(persona, data);
      case "fraud_alert":
        return this.formatFraudAlert(persona, data);
      case "no_show_detected":
        return this.formatNoShowDetected(persona, data);
      case "provider_matched":
        return this.formatProviderMatched(persona, data);
      case "payment_failed":
        return this.formatPaymentFailed(persona, data);
      case "skill_milestone":
        return this.formatSkillMilestone(persona, data);
      default:
        return this.formatGenericMessage(persona, data);
    }
  }

  /**
   * JOB SPAWNED - Recurring job automatically created
   */
  private formatJobSpawned(persona: Persona, data: any): FormattedMessage {
    const { jobTitle, budget, clientName, category, location } = data;

    switch (persona) {
      case "customer":
        return {
          title: `Your ${category} job is live`,
          body: `"${jobTitle}" (₱${this.formatCurrency(budget)}) is now active and accepting quotes. Providers are viewing it now.`,
          nextSteps: [
            "Review incoming quotes",
            "Select a provider",
            "Fund escrow when ready",
          ],
          actionUrl: `/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, type: "job_spawned" },
        };

      case "admin":
        return {
          title: `Job Spawned - Recurring Series`,
          body: [
            `Job: ${jobTitle} (₱${this.formatCurrency(budget)})`,
            `Client: ${clientName}`,
            `Category: ${category}`,
            `Location: ${location}`,
            `Recurring: Run #${data.runNumber} of ${data.maxRuns}`,
            `Status: ${data.providerId ? "Auto-assigned" : "Open for quotes"}`,
          ].join("\n"),
          actionUrl: `/admin/jobs/${data.jobId}`,
          dataPayload: {
            jobId: data.jobId,
            type: "job_spawned_admin",
            recurringId: data.recurringScheduleId,
          },
        };

      case "provider":
        return {
          title: `New ${category} job: ${jobTitle}`,
          body: [
            `Budget: ₱${this.formatCurrency(budget)}`,
            `Location: ${location}`,
            `Client: ${clientName}`,
            `Category: ${category}`,
          ].join("\n"),
          nextSteps: ["Review details", "Submit quote or accept job"],
          actionUrl: `/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, type: "job_spawned_provider" },
        };
    }
  }

  /**
   * JOB ASSIGNED - Provider locked and job auto-assigned
   */
  private formatJobAssigned(persona: Persona, data: any): FormattedMessage {
    const {
      jobTitle,
      budget,
      providerName,
      clientName,
      location,
      scheduleDate,
    } = data;

    switch (persona) {
      case "customer":
        return {
          title: `${providerName} confirmed for your job`,
          body: `Your recurring provider is assigned to "${jobTitle}". Confirm & fund escrow by ${this.formatDate(scheduleDate)}.`,
          nextSteps: ["Review provider details", "Fund escrow"],
          actionUrl: `/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, providerId: data.providerId },
        };

      case "admin":
        return {
          title: `Provider Auto-Assigned - Recurring Job`,
          body: [
            `Job: ${jobTitle} (₱${this.formatCurrency(budget)})`,
            `Provider: ${providerName}`,
            `Client: ${clientName}`,
            `Status: Assigned (awaiting escrow fund)`,
            `Reason: Recurring schedule - same provider preference`,
          ].join("\n"),
          actionUrl: `/admin/jobs/${data.jobId}`,
          dataPayload: {
            jobId: data.jobId,
            providerId: data.providerId,
            recurring: true,
          },
        };

      case "provider":
        return {
          title: `Job assigned: ${jobTitle}`,
          body: [
            `Client: ${clientName}`,
            `Budget: ₱${this.formatCurrency(budget)}`,
            `Location: ${location}`,
            `Scheduled: ${this.formatDate(scheduleDate)}`,
          ].join("\n"),
          nextSteps: ["Check availability", "Confirm acceptance"],
          actionUrl: `/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, type: "assigned" },
        };
    }
  }

  /**
   * JOB STARTED - Provider began work
   */
  private formatJobStarted(persona: Persona, data: any): FormattedMessage {
    const { jobTitle, providerName, clientName, location } = data;

    switch (persona) {
      case "customer":
        return {
          title: `${providerName} started your job`,
          body: `Your "${jobTitle}" job is underway at ${location}. Message them directly with updates.`,
          actionUrl: `/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, type: "started" },
        };

      case "admin":
        return {
          title: `Job Started`,
          body: [
            `Job: ${jobTitle}`,
            `Provider: ${providerName}`,
            `Client: ${clientName}`,
            `Status: In Progress`,
            `Started: ${this.formatDateTime(data.startTime)}`,
          ].join("\n"),
          actionUrl: `/admin/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, type: "started_admin" },
        };

      case "provider":
        return {
          title: `Job confirmed started`,
          body: `You're now 30 mins into "${jobTitle}". Submit after-photos when complete.`,
          nextSteps: ["Take before/after photos", "Submit completion"],
          actionUrl: `/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, type: "started" },
        };
    }
  }

  /**
   * JOB COMPLETED - Provider finished and submitted
   */
  private formatJobCompleted(persona: Persona, data: any): FormattedMessage {
    const { jobTitle, providerName, clientName, budget, rating } = data;

    switch (persona) {
      case "customer":
        return {
          title: `${providerName} completed your job`,
          body: `"${jobTitle}" is done! Review and rate them (optional). Payment will be released in 7 days.`,
          nextSteps: ["View completion details", "Leave a review"],
          actionUrl: `/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, type: "completed" },
        };

      case "admin":
        return {
          title: `Job Completed`,
          body: [
            `Job: ${jobTitle} (₱${this.formatCurrency(budget)})`,
            `Provider: ${providerName}`,
            `Client: ${clientName}`,
            `Status: Completed`,
            `Auto-Release: ${data.autoPayEnabled ? "YES" : "Pending review"}`,
            `Rating: ${rating ? `${rating}/5` : "Not yet rated"}`,
          ].join("\n"),
          actionUrl: `/admin/jobs/${data.jobId}`,
          dataPayload: {
            jobId: data.jobId,
            autoPayEnabled: data.autoPayEnabled,
          },
        };

      case "provider":
        return {
          title: `Payment confirmed: ₱${this.formatCurrency(budget)}`,
          body: `Your "${jobTitle}" job earnings will be deposited in 2-3 business days.`,
          nextSteps: ["Check wallet", "Track payout"],
          actionUrl: `/wallet`,
          dataPayload: { jobId: data.jobId, type: "completed" },
        };
    }
  }

  /**
   * ESCROW RELEASED - Payment released to provider
   */
  private formatEscrowReleased(persona: Persona, data: any): FormattedMessage {
    const { jobTitle, budget, providerName, clientName } = data;

    switch (persona) {
      case "customer":
        return {
          title: `Payment released to ${providerName}`,
          body: `✓ ₱${this.formatCurrency(budget)} has been transferred for "${jobTitle}".`,
          actionUrl: `/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, type: "escrow_released" },
        };

      case "admin":
        return {
          title: `Escrow Released`,
          body: [
            `Amount: ₱${this.formatCurrency(budget)}`,
            `Job: ${jobTitle}`,
            `Provider: ${providerName}`,
            `Client: ${clientName}`,
            `Auto-Release: ${data.autoRelease ? "Yes" : "No"}`,
            `Released: ${this.formatDateTime(data.releasedAt)}`,
          ].join("\n"),
          actionUrl: `/admin/accounting/entries?jobId=${data.jobId}`,
          dataPayload: { jobId: data.jobId, autoRelease: data.autoRelease },
        };

      case "provider":
        return {
          title: `₱${this.formatCurrency(budget)} deposited to wallet`,
          body: `From: "${jobTitle}". Transfer to bank account pending.`,
          nextSteps: ["View wallet details", "Request payout"],
          actionUrl: `/wallet`,
          dataPayload: { jobId: data.jobId, type: "escrow_released" },
        };
    }
  }

  /**
   * ESCALATION ALERT - Issue requires intervention
   */
  private formatEscalationAlert(persona: Persona, data: any): FormattedMessage {
    const { jobTitle, reason, severity } = data;

    switch (persona) {
      case "customer":
        return {
          title: `Issue with your ${jobTitle} job`,
          body: `We noticed a potential issue. Our team is checking it and will contact you soon.`,
          nextSteps: ["Check your messages", "Be available to respond"],
          actionUrl: `/support`,
          dataPayload: { escalationId: data.escalationId, type: "escalation" },
        };

      case "admin":
        return {
          title: `⚠️ ESCALATION - ${reason}`,
          body: [
            `Job: ${jobTitle}`,
            `Severity: ${severity}`,
            `Client: ${data.clientName}`,
            `Provider: ${data.providerName}`,
            `Reason: ${reason}`,
            `Time: ${this.formatDateTime(data.escalatedAt)}`,
          ].join("\n"),
          nextSteps: ["Review details", "Take action"],
          actionUrl: `/admin/jobs/${data.jobId}`,
          dataPayload: {
            escalationId: data.escalationId,
            severity,
            type: "escalation_admin",
          },
        };

      case "provider":
        return {
          title: `Heads up: Issue flagged on "${jobTitle}"`,
          body: `Our support team is looking into it. Please avoid further contact until resolved.`,
          actionUrl: `/support`,
          dataPayload: { escalationId: data.escalationId, type: "escalation" },
        };
    }
  }

  /**
   * FRAUD ALERT - Suspicious activity
   */
  private formatFraudAlert(persona: Persona, data: any): FormattedMessage {
    const { jobTitle, riskLevel, flags } = data;

    switch (persona) {
      case "customer":
        return {
          title: `Security check needed`,
          body: `We're verifying your "${jobTitle}" job details for your protection. You'll hear from us soon.`,
          actionUrl: `/support`,
          dataPayload: { jobId: data.jobId, type: "fraud_alert" },
        };

      case "admin":
        return {
          title: `⛔ FRAUD ALERT - ${riskLevel} Risk`,
          body: [
            `Job: ${jobTitle}`,
            `Risk Level: ${riskLevel}`,
            `Flags: ${flags.join(", ")}`,
            `Client: ${data.clientName}`,
            `Client History: ${data.clientJobCount} jobs`,
            `Recommended Action: ${this.getFraudAction(riskLevel)}`,
          ].join("\n"),
          nextSteps: ["Review fraud details", "Take action"],
          actionUrl: `/admin/fraud?jobId=${data.jobId}`,
          dataPayload: { jobId: data.jobId, riskLevel, type: "fraud_admin" },
        };

      case "provider":
        return {
          title: `Job under review`,
          body: `We're verifying "${jobTitle}" details for safety. Hold your acceptance for a moment.`,
          actionUrl: `/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, type: "fraud_alert" },
        };
    }
  }

  /**
   * NO-SHOW DETECTED - Provider didn't show up
   */
  private formatNoShowDetected(persona: Persona, data: any): FormattedMessage {
    const { jobTitle, clientName, providerName, scheduleTime } = data;

    switch (persona) {
      case "customer":
        return {
          title: `${providerName} didn't show up`,
          body: `Your "${jobTitle}" job was scheduled for ${this.formatTime(scheduleTime)} but provider wasn't detected. We're finding a replacement.`,
          nextSteps: ["Check messages for updates"],
          actionUrl: `/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, type: "no_show" },
        };

      case "admin":
        return {
          title: `NO-SHOW DETECTED`,
          body: [
            `Job: ${jobTitle}`,
            `Scheduled: ${this.formatDateTime(scheduleTime)}`,
            `Provider: ${providerName}`,
            `Client: ${clientName}`,
            `Reason: No GPS check-in detected`,
            `Action: Initiating provider replacement (Attempt ${data.attemptNumber})`,
          ].join("\n"),
          nextSteps: ["Monitor replacement", "Escalate if pattern emerges"],
          actionUrl: `/admin/jobs/${data.jobId}`,
          dataPayload: {
            jobId: data.jobId,
            providerId: data.providerId,
            type: "no_show_admin",
          },
        };

      case "provider":
        return {
          title: `No-show recorded on "${jobTitle}"`,
          body: `You were marked absent for your scheduled job. This affects your reliability rating. Check your details.`,
          nextSteps: ["Contact support if this is an error"],
          actionUrl: `/support`,
          dataPayload: { jobId: data.jobId, type: "no_show" },
        };
    }
  }

  /**
   * PROVIDER MATCHED - Best provider found for job
   */
  private formatProviderMatched(persona: Persona, data: any): FormattedMessage {
    const { jobTitle, providerName, rating, expertise } = data;

    switch (persona) {
      case "customer":
        return {
          title: `Perfect match found: ${providerName}`,
          body: `${providerName} (${rating}⭐, ${expertise}) just quoted for your "${jobTitle}". Check them out!`,
          nextSteps: ["Review profile", "Accept quote"],
          actionUrl: `/jobs/${data.jobId}`,
          dataPayload: { providerId: data.providerId, jobId: data.jobId },
        };

      case "admin":
        return {
          title: `Provider Matched - Top Candidate`,
          body: [
            `Job: ${jobTitle}`,
            `Provider: ${providerName}`,
            `Match Score: ${data.matchScore}%`,
            `Rating: ${rating}⭐`,
            `Expertise: ${expertise}`,
            `Prior Jobs: ${data.completedJobs}`,
          ].join("\n"),
          actionUrl: `/admin/jobs/${data.jobId}`,
          dataPayload: {
            jobId: data.jobId,
            providerId: data.providerId,
            matchScore: data.matchScore,
          },
        };

      case "provider":
        return {
          title: `New quote opportunity: ${jobTitle}`,
          body: [
            `Budget: ₱${this.formatCurrency(data.budget)}`,
            `Location: ${data.location}`,
            `Client: ${data.clientName} (${data.clientRating}⭐)`,
          ].join("\n"),
          nextSteps: ["Review job", "Submit quote"],
          actionUrl: `/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, type: "matched" },
        };
    }
  }

  /**
   * PAYMENT FAILED - Transaction error
   */
  private formatPaymentFailed(persona: Persona, data: any): FormattedMessage {
    const { jobTitle, amount, reason } = data;

    switch (persona) {
      case "customer":
        return {
          title: `We couldn't process your payment`,
          body: `Failed to fund escrow for "${jobTitle}". ${reason}. Try again or contact support.`,
          nextSteps: ["Try a different card", "Contact support"],
          actionUrl: `/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, type: "payment_failed" },
        };

      case "admin":
        return {
          title: `❌ Payment Failed`,
          body: [
            `Job: ${jobTitle}`,
            `Amount: ₱${this.formatCurrency(amount)}`,
            `Client: ${data.clientName}`,
            `Reason: ${reason}`,
            `Error Code: ${data.errorCode}`,
          ].join("\n"),
          actionUrl: `/admin/jobs/${data.jobId}`,
          dataPayload: { jobId: data.jobId, type: "payment_failed_admin" },
        };

      case "provider":
        return {
          title: `Payment processing delayed`,
          body: `Your "${jobTitle}" payout is pending client payment clearance.`,
          nextSteps: ["Check back later"],
          actionUrl: `/wallet`,
          dataPayload: { jobId: data.jobId, type: "payment_failed" },
        };
    }
  }

  /**
   * SKILL MILESTONE - Provider reached mastery tier
   */
  private formatSkillMilestone(persona: Persona, data: any): FormattedMessage {
    const { providerName, skill, milestone, jobsCompleted } = data;

    switch (persona) {
      case "customer":
        return {
          title: `Your provider ${providerName} is now an <b>${milestone}</b>`,
          body: `They've mastered ${skill} with ${jobsCompleted} successful completions. Quality just got even better!`,
          actionUrl: `/jobs`,
          dataPayload: {
            providerId: data.providerId,
            type: "skill_milestone",
          },
        };

      case "admin":
        return {
          title: `Provider Milestone - Skill Mastery`,
          body: [
            `Provider: ${providerName}`,
            `Skill: ${skill}`,
            `Milestone: ${milestone}`,
            `Jobs Completed: ${jobsCompleted}`,
            `Suggested Actions: Feature in "Expert ${skill}" category, offer higher-budget jobs`,
          ].join("\n"),
          actionUrl: `/admin/users/${data.providerId}`,
          dataPayload: {
            providerId: data.providerId,
            skill,
            milestone,
            type: "skill_milestone_admin",
          },
        };

      case "provider":
        return {
          title: `🎉 You've reached ${milestone} in ${skill}!`,
          body: `You're now officially a ${milestone}. More clients will see you for ${skill} jobs. Keep it up!`,
          nextSteps: ["View profile", "Attract premium jobs"],
          actionUrl: `/profile`,
          dataPayload: {
            skill,
            milestone,
            type: "skill_milestone",
          },
        };
    }
  }

  /**
   * GENERIC MESSAGE - Fallback for unmapped scenarios
   */
  private formatGenericMessage(persona: Persona, data: any): FormattedMessage {
    switch (persona) {
      case "customer":
        return {
          title: data.title || "Update from LocalPro",
          body: data.message || "We have an update for you.",
          actionUrl: data.actionUrl,
          dataPayload: data,
        };

      case "admin":
        return {
          title: data.title || "System Alert",
          body: JSON.stringify(data, null, 2),
          actionUrl: data.actionUrl,
          dataPayload: data,
        };

      case "provider":
        return {
          title: data.title || "Notification",
          body: data.message || "You have a new notification.",
          actionUrl: data.actionUrl,
          dataPayload: data,
        };
    }
  }

  // HELPER FUNCTIONS

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    })
      .format(amount)
      .replace("PHP", "")
      .trim();
  }

  private formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  private formatDateTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private formatTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private getFraudAction(riskLevel: string): string {
    switch (riskLevel) {
      case "HIGH":
        return "BLOCK immediately, review full history";
      case "MEDIUM":
        return "Request verification, monitor closely";
      case "LOW":
        return "Monitor, allow with 2x fraud score vigilance";
      default:
        return "Review manually";
    }
  }
}

export const messageFormatterService = new MessageFormatterService();
