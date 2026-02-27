import type { Types } from "mongoose";

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = "client" | "provider" | "admin";

// ─── Upload ───────────────────────────────────────────────────────────────────

export type UploadFolder = "jobs/before" | "jobs/after" | "avatars" | "misc";

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
  | "refunded"
  | "expired";

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
  specialInstructions?: string;
  riskScore: number;
  beforePhoto?: string[];
  afterPhoto?: string[];
  coordinates?: { type: "Point"; coordinates: [number, number] } | null;
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
  | "job_started"
  | "job_completed"
  | "escrow_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "review_submitted"
  | "job_expired"
  | "quote_expired";

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

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType =
  | "job_submitted"
  | "job_approved"
  | "job_rejected"
  | "quote_received"
  | "quote_accepted"
  | "quote_rejected"
  | "escrow_funded"
  | "payment_confirmed"
  | "payment_failed"
  | "job_completed"
  | "escrow_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "review_received"
  | "new_message"
  | "job_expired"
  | "escrow_auto_released"
  | "quote_expired"
  | "reminder_fund_escrow"
  | "reminder_no_quotes";

export interface INotification {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    jobId?: string;
    quoteId?: string;
    disputeId?: string;
    messageThreadId?: string;
    paymentIntentId?: string;
  };
  readAt?: Date | null;
  createdAt: Date;
}

// ─── Message ──────────────────────────────────────────────────────────────────

export interface IMessage {
  _id: Types.ObjectId | string;
  /** Scoped to a job (one thread per job) */
  threadId: string;
  senderId: Types.ObjectId | string | IUser;
  receiverId: Types.ObjectId | string | IUser;
  body: string;
  readAt?: Date | null;
  createdAt: Date;
}

// ─── ProviderProfile ──────────────────────────────────────────────────────────

export type AvailabilityStatus = "available" | "busy" | "unavailable";

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface WorkSlot {
  /** Whether the provider works on this day */
  enabled: boolean;
  /** Start time in "HH:MM" 24-hour format */
  from: string;
  /** End time in "HH:MM" 24-hour format */
  to: string;
}

export type WeeklySchedule = Record<DayOfWeek, WorkSlot>;

export const DEFAULT_SCHEDULE: WeeklySchedule = {
  mon: { enabled: true,  from: "08:00", to: "17:00" },
  tue: { enabled: true,  from: "08:00", to: "17:00" },
  wed: { enabled: true,  from: "08:00", to: "17:00" },
  thu: { enabled: true,  from: "08:00", to: "17:00" },
  fri: { enabled: true,  from: "08:00", to: "17:00" },
  sat: { enabled: true,  from: "08:00", to: "13:00" },
  sun: { enabled: false, from: "08:00", to: "17:00" },
};

export interface PortfolioItem {
  title: string;
  description: string;
  imageUrl?: string;
}

export interface IProviderProfile {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string | IUser;
  bio: string;
  skills: string[];
  yearsExperience: number;
  hourlyRate?: number;
  portfolioItems: PortfolioItem[];
  availabilityStatus: AvailabilityStatus;
  schedule: WeeklySchedule;
  /** Recomputed on each review submission */
  avgRating: number;
  completedJobCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export type PaymentStatus =
  | "awaiting_payment"
  | "processing"
  | "paid"
  | "failed"
  | "refunded";

export interface IPayment {
  _id: Types.ObjectId | string;
  jobId: Types.ObjectId | string | IJob;
  clientId: Types.ObjectId | string | IUser;
  providerId?: Types.ObjectId | string | IUser | null;
  /** PayMongo payment_intent id (pi_xxx) */
  paymentIntentId: string;
  /** Frontend key for attaching a payment method */
  clientKey: string;
  /** Amount in PHP */
  amount: number;
  amountInCentavos: number;
  currency: string;
  status: PaymentStatus;
  paymentMethodType?: string;
  /** PayMongo payment id (pay_xxx) set on webhook confirmation */
  paymentId?: string;
  refundId?: string;
  createdAt: Date;
  updatedAt: Date;
}
// ─── Category ─────────────────────────────────────────────────────────────────

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}