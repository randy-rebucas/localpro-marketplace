import type { Types } from "mongoose";

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = "client" | "provider" | "admin";

export interface IUser {
  _id: Types.ObjectId | string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isVerified: boolean;
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = Omit<IUser, "password">;

// ─── Job ──────────────────────────────────────────────────────────────────────

export type JobStatus =
  | "pending_validation"
  | "open"
  | "assigned"
  | "in_progress"
  | "completed"
  | "disputed"
  | "rejected"
  | "refunded";

export type EscrowStatus = "not_funded" | "funded" | "released" | "refunded";

export interface IJob {
  _id: Types.ObjectId | string;
  clientId: Types.ObjectId | string | IUser;
  providerId?: Types.ObjectId | string | IUser | null;
  category: string;
  title: string;
  description: string;
  budget: number;
  status: JobStatus;
  escrowStatus: EscrowStatus;
  location: string;
  scheduleDate: Date;
  riskScore: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Quote ────────────────────────────────────────────────────────────────────

export type QuoteStatus = "pending" | "accepted" | "rejected";

export interface IQuote {
  _id: Types.ObjectId | string;
  jobId: Types.ObjectId | string | IJob;
  providerId: Types.ObjectId | string | IUser;
  proposedAmount: number;
  timeline: string;
  message: string;
  status: QuoteStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export type TransactionStatus = "pending" | "completed" | "refunded";

export interface ITransaction {
  _id: Types.ObjectId | string;
  jobId: Types.ObjectId | string | IJob;
  payerId: Types.ObjectId | string | IUser;
  payeeId: Types.ObjectId | string | IUser;
  amount: number;
  commission: number;
  netAmount: number;
  status: TransactionStatus;
  createdAt: Date;
}

// ─── Review ───────────────────────────────────────────────────────────────────

export interface IReview {
  _id: Types.ObjectId | string;
  jobId: Types.ObjectId | string | IJob;
  clientId: Types.ObjectId | string | IUser;
  providerId: Types.ObjectId | string | IUser;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback: string;
  createdAt: Date;
}

// ─── Dispute ──────────────────────────────────────────────────────────────────

export type DisputeStatus = "open" | "investigating" | "resolved";

export interface IDispute {
  _id: Types.ObjectId | string;
  jobId: Types.ObjectId | string | IJob;
  raisedBy: Types.ObjectId | string | IUser;
  reason: string;
  status: DisputeStatus;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export type ActivityEventType =
  | "job_created"
  | "job_approved"
  | "job_rejected"
  | "quote_submitted"
  | "quote_accepted"
  | "escrow_funded"
  | "job_completed"
  | "escrow_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "review_submitted";

export interface IActivityLog {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  eventType: ActivityEventType;
  jobId?: Types.ObjectId | string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Admin Stats ──────────────────────────────────────────────────────────────

export interface AdminStats {
  totalGMV: number;
  totalCommission: number;
  activeJobs: number;
  escrowBalance: number;
  openDisputes: number;
  jobsByStatus: Record<JobStatus, number>;
}
