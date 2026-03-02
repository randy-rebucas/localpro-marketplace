import type { Types } from "mongoose";

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = "client" | "provider" | "admin" | "staff";

export type StaffCapability =
  | "manage_jobs"
  | "manage_kyc"
  | "manage_disputes"
  | "manage_users"
  | "view_revenue"
  | "manage_payouts"
  | "manage_categories"
  | "manage_support";

export interface IAddress {
  _id: string;
  /** Short label, e.g. "Home", "Office" */
  label: string;
  /** Full address string */
  address: string;
  isDefault: boolean;
  /** Resolved lat/lng — enables proximity filtering */
  coordinates?: { lat: number; lng: number };
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export type UploadFolder = "jobs/before" | "jobs/after" | "avatars" | "kyc" | "misc";

export interface IUser {
  _id: Types.ObjectId | string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  isVerified: boolean;
  isSuspended: boolean;
  approvalStatus: "pending_approval" | "approved" | "rejected";
  avatar?: string;
  facebookId?: string;
  oauthProvider?: "facebook" | null;
  phone?: string | null;
  kycStatus?: "none" | "pending" | "approved" | "rejected";
  kycDocuments?: Array<{ type: string; url: string; uploadedAt: Date }>;
  kycRejectionReason?: string;
  addresses?: IAddress[];
  capabilities?: StaffCapability[];
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
  /** Non-null when client chose to partially release escrow; remaining was refunded */
  partialReleaseAmount?: number | null;
  location: string;
  scheduleDate: Date;
  specialInstructions?: string;
  riskScore: number;
  beforePhoto?: string[];
  afterPhoto?: string[];
  coordinates?: { type: "Point"; coordinates: [number, number] } | null;
  /** When set, admin approval assigns this job directly to the provider */
  invitedProviderId?: Types.ObjectId | string | IUser | null;
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

export interface IReviewBreakdown {
  quality: 1 | 2 | 3 | 4 | 5;
  professionalism: 1 | 2 | 3 | 4 | 5;
  punctuality: 1 | 2 | 3 | 4 | 5;
  communication: 1 | 2 | 3 | 4 | 5;
}

export interface IReview {
  _id: Types.ObjectId | string;
  jobId: Types.ObjectId | string | IJob;
  clientId: Types.ObjectId | string | IUser;
  providerId: Types.ObjectId | string | IUser;
  rating: 1 | 2 | 3 | 4 | 5;
  breakdown?: IReviewBreakdown;
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
  evidence?: string[];
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
  | "quote_expired"
  | "payout_requested"
  | "payout_updated";

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

// ─── Knowledge Base ───────────────────────────────────────────────────────────

export type KnowledgeAudience = "client" | "provider" | "both";

export interface IKnowledgeArticle {
  _id: Types.ObjectId | string;
  title: string;
  excerpt: string;
  content: string;
  group: string;
  audience: KnowledgeAudience;
  order: number;
  isPublished: boolean;
  createdBy: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Announcement ─────────────────────────────────────────────────────────────

export type AnnouncementType = "info" | "warning" | "success" | "danger";
export type AnnouncementTarget = "all" | "client" | "provider" | "admin" | "staff";

export interface IAnnouncement {
  _id: Types.ObjectId | string;
  title: string;
  message: string;
  type: AnnouncementType;
  targetRoles: AnnouncementTarget[];
  isActive: boolean;
  expiresAt?: Date | null;
  createdBy: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
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
  | "reminder_no_quotes"
  | "reminder_start_job"
  | "reminder_complete_job"
  | "reminder_leave_review"
  | "reminder_stale_dispute"
  | "reminder_pending_validation"
  | "payout_requested"
  | "payout_status_update"
  | "job_direct_invite";

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
    payoutId?: string;
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

export interface IServiceArea {
  _id: string;
  label: string;
  address: string;
  coordinates?: { lat: number; lng: number };
}

export interface IProviderProfile {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string | IUser;
  bio: string;
  skills: string[];
  yearsExperience: number;
  hourlyRate?: number;
  portfolioItems: PortfolioItem[];
  serviceAreas: IServiceArea[];
  availabilityStatus: AvailabilityStatus;
  schedule: WeeklySchedule;
  /** Recomputed on each review submission */
  avgRating: number;
  completedJobCount: number;
  /** 0-100; recomputed on job completion/cancellation */
  completionRate: number;
  /** Average hours from job assignment to first status update; recomputed on first progress update */
  avgResponseTimeHours: number;
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
// ─── Payout ───────────────────────────────────────────────────────────────────

export type PayoutStatus = "pending" | "processing" | "completed" | "rejected";

export interface IPayout {
  _id: Types.ObjectId | string;
  providerId: Types.ObjectId | string | IUser;
  amount: number;
  status: PayoutStatus;
  bankName: string;
  accountNumber: string;
  accountName: string;
  notes?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Favorite Provider ───────────────────────────────────────────────────────

export interface IFavoriteProvider {
  _id: Types.ObjectId | string;
  clientId: Types.ObjectId | string | IUser;
  providerId: Types.ObjectId | string | IUser;
  createdAt: Date;
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}