import type { IJob, JobStatus, EscrowStatus } from "@/types";

interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

type StatusTransitionMap = Partial<Record<JobStatus, JobStatus[]>>;

const VALID_TRANSITIONS: StatusTransitionMap = {
  pending_validation: ["open", "rejected"],
  open: ["assigned", "rejected"],
  assigned: ["in_progress", "disputed"],
  in_progress: ["completed", "disputed"],
  completed: [],
  disputed: ["completed", "refunded"],
  rejected: [],
  refunded: [],
};

/**
 * Validates whether a job status transition is allowed.
 */
export function canTransition(
  job: IJob,
  newStatus: JobStatus
): TransitionResult {
  const allowed = VALID_TRANSITIONS[job.status] ?? [];

  if (!allowed.includes(newStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition from '${job.status}' to '${newStatus}'`,
    };
  }

  // Business rule: cannot mark completed if escrow not funded
  if (newStatus === "completed" && job.escrowStatus !== "funded") {
    return {
      allowed: false,
      reason: "Escrow must be funded before the job can be marked as completed",
    };
  }

  return { allowed: true };
}

/**
 * Validates escrow status transitions.
 */
export function canTransitionEscrow(
  job: IJob,
  newEscrowStatus: EscrowStatus
): TransitionResult {
  if (newEscrowStatus === "funded") {
    if (job.status !== "assigned") {
      return {
        allowed: false,
        reason: "Escrow can only be funded after a provider is assigned",
      };
    }
    if (job.escrowStatus !== "not_funded") {
      return {
        allowed: false,
        reason: "Escrow is already funded or has been processed",
      };
    }
  }

  if (newEscrowStatus === "released") {
    if (job.status !== "completed") {
      return {
        allowed: false,
        reason: "Escrow can only be released after the job is completed",
      };
    }
    if (job.escrowStatus !== "funded") {
      return {
        allowed: false,
        reason: "Escrow must be in funded state to be released",
      };
    }
  }

  if (newEscrowStatus === "refunded") {
    if (!["funded", "disputed"].includes(job.escrowStatus)) {
      return {
        allowed: false,
        reason: "Only funded or disputed escrow can be refunded",
      };
    }
  }

  return { allowed: true };
}
