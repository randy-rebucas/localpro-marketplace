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
  dateOfBirth?: Date | string | null;
  gender?: "male" | "female" | "other" | null;
  /** Number of jobs by this user that were flagged during fraud detection */
  flaggedJobCount?: number;
  /** Active fraud/suspicious-behaviour flags */
  fraudFlags?: string[];
  /** Saved card PM ID for recurring auto-pay (card only) */
  savedPaymentMethodId?: string | null;
  savedPaymentMethodLast4?: string | null;
  savedPaymentMethodBrand?: string | null;
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

// ─── Milestone ────────────────────────────────────────────────────────────────

export type MilestoneStatus = "pending" | "released";

export interface IMilestone {
  _id: Types.ObjectId | string;
  title: string;
  amount: number;
  description?: string;
  status: MilestoneStatus;
  releasedAt?: Date;
}

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
  /** Fraud / spam flags generated at submission time */
  fraudFlags?: string[];
  beforePhoto?: string[];
  afterPhoto?: string[];
  coordinates?: { type: "Point"; coordinates: [number, number] } | null;
  /** When set, admin approval assigns this job directly to the provider */
  invitedProviderId?: Types.ObjectId | string | IUser | null;
  /** Optional milestone payment plan — each milestone can be released individually */
  milestones?: IMilestone[];
  /** Non-null when this job was auto-spawned by a recurring schedule */
  recurringScheduleId?: Types.ObjectId | string | null;
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
  | "payout_updated"
  | "consultation_requested"
  | "consultation_accepted"
  | "consultation_declined"
  | "consultation_converted_to_job"
  | "consultation_stale_accepted"
  | "recurring_created"
  | "recurring_cancelled"
  | "recurring_job_spawned";

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

// ─── Consultation ─────────────────────────────────────────────────────────────

export type ConsultationType = "site_inspection" | "chat";

export type ConsultationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "converted"
  | "expired";

export interface IConsultation {
  _id: Types.ObjectId | string;
  initiatorId: Types.ObjectId | string | IUser;
  targetUserId: Types.ObjectId | string | IUser;
  initiatorRole: "client" | "provider";
  type: ConsultationType;
  title: string;
  description: string;
  location: string;
  coordinates?: {
    type: "Point";
    coordinates: [number, number];
  } | null;
  photos: string[];
  conversationThreadId: string;
  status: ConsultationStatus;
  estimateProvidedAt?: Date | null;
  estimateProvidedBy?: Types.ObjectId | string | IUser | null;
  estimateAmount?: number | null;
  estimateNote?: string;
  jobCreatedFromConsultationId?: Types.ObjectId | string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

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
  | "reminder_profile_incomplete"
  | "payout_requested"
  | "payout_status_update"
  | "job_direct_invite"
  | "consultation_request"
  | "consultation_accepted"
  | "estimate_provided"
  | "consultation_expired"
  | "consultation_stale"
  | "recurring_job_spawned"
  | "payment_reminder"
  | "admin_message";

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
    consultationId?: string;
    initiatorId?: string;
    estimateAmount?: number;
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
  /** 'text' = regular, 'file' = attachment, 'system' = auto-generated note */
  type?: "text" | "file" | "system";
  fileUrl?: string;
  fileName?: string;
  fileMime?: string;
  fileSize?: number;
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
  workExperiences?: string[];
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
  /** Manually awarded by admin after vetting — shows LocalPro Certified badge */
  isLocalProCertified?: boolean;
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

// ─── Loyalty & Rewards ────────────────────────────────────────────────────────

export type ClientTier = "standard" | "silver" | "gold" | "platinum";

export type LoyaltyTransactionType =
  | "earned_job"
  | "earned_first_job"
  | "earned_referral"
  | "earned_review"
  | "redeemed"
  | "credit_applied";

export interface ILoyaltyAccount {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string | IUser;
  points: number;
  lifetimePoints: number;
  credits: number;
  tier: ClientTier;
  referralCode: string;
  referredBy?: Types.ObjectId | string | null;
  referralBonusAwarded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoyaltyTransaction {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string | IUser;
  type: LoyaltyTransactionType;
  points: number;
  credits: number;
  jobId?: Types.ObjectId | string | null;
  description: string;
  createdAt: Date;
}

// ─── Recurring Schedule ───────────────────────────────────────────────────────

export type RecurringFrequency = "weekly" | "monthly";
export type RecurringStatus    = "active" | "paused" | "cancelled";

/** Categories eligible for recurring bookings. */
export const RECURRING_CATEGORIES = [
  "Cleaning",
  "Maintenance",
  "Landscaping",
  "Pest Control",
] as const;

export interface IRecurringSchedule {
  _id: Types.ObjectId | string;
  clientId: Types.ObjectId | string | IUser;
  /** Optional: pin to a specific provider */
  providerId?: Types.ObjectId | string | IUser | null;
  category: string;
  title: string;
  description: string;
  budget: number;
  location: string;
  frequency: RecurringFrequency;
  status: RecurringStatus;
  /** Whether to send auto-pay notification on each spawn */
  autoPayEnabled: boolean;
  specialInstructions?: string;
  /** When the next job should be spawned */
  nextRunAt: Date;
  /** When the last job was spawned */
  lastRunAt?: Date | null;
  /** Running count of spawned jobs */
  totalRuns: number;
  /** Optional cap on total runs; null = unlimited */
  maxRuns?: number | null;
  pausedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
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