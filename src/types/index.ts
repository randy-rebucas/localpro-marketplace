import type { Types } from "mongoose";

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = "client" | "provider" | "admin" | "staff" | "peso";

export type StaffCapability =
  | "manage_jobs"
  | "manage_kyc"
  | "manage_disputes"
  | "manage_users"
  | "manage_agencies"
  | "manage_businesses"
  | "view_revenue"
  | "manage_payouts"
  | "manage_categories"
  | "manage_support"
  | "manage_courses";

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

export interface IUserPreferences {
  /** Receive email notifications for job/quote updates */
  emailNotifications: boolean;
  /** Receive browser push notifications */
  pushNotifications: boolean;
  /** Receive SMS notifications */
  smsNotifications: boolean;
  /** Receive marketing/promotional emails */
  marketingEmails: boolean;
  /** Real-time message notifications */
  messageNotifications: boolean;
  /** For providers: show profile in search results */
  profileVisible: boolean;
  // ── Provider-only ──────────────────────────────────────────────
  /** Alert when new jobs matching skills are posted */
  newJobAlerts: boolean;
  /** Remind before submitted quotes expire */
  quoteExpiryReminders: boolean;
  /** Alert when directly invited to bid on a job */
  jobInviteAlerts: boolean;
  /** Alert when a client leaves a review */
  reviewAlerts: boolean;
  /** Allow clients to book instantly without waiting for manual acceptance */
  instantBooking: boolean;
  /** Auto-send a quote read-receipt to client when you open their job */
  autoReadReceipt: boolean;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export type UploadFolder = "jobs/before" | "jobs/after" | "avatars" | "kyc" | "misc" | "peso/logos" | "resumes";

export interface IUser {
  _id: Types.ObjectId | string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  isVerified: boolean;
  isSuspended: boolean;
  approvalStatus: "pending_approval" | "approved" | "rejected";
  accountType?: "personal" | "business";
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
  /** Agency this provider belongs to as a staff member (null = solo / owner) */
  agencyId?: Types.ObjectId | string | null;
  /** Saved card PM ID for recurring auto-pay (card only) */
  savedPaymentMethodId?: string | null;
  savedPaymentMethodLast4?: string | null;
  savedPaymentMethodBrand?: string | null;
  preferences?: IUserPreferences;
  /** Last time the user made an authenticated request — used for online indicator. */
  lastSeenAt?: Date | string | null;
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
  | "expired"
  | "cancelled";

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
  // ── PESO fields ────────────────────────────────────────────────
  /** Who posted this job: private client, PESO office, or LGU */
  jobSource: "private" | "peso" | "lgu";
  /** Tags for government / PESO job classification */
  jobTags?: JobTag[];
  /** PESO officer user ID who posted the job */
  pesoPostedBy?: Types.ObjectId | string | IUser | null;
  /** Priority jobs are pinned to the top of the provider marketplace */
  isPriority?: boolean;
  /** Urgency level selected at job creation: standard (free), same_day (+₱50), rush (+₱100) */
  urgency?: "standard" | "same_day" | "rush";
  /** Flat urgent booking fee locked in at creation from AppSettings (PHP) */
  urgencyFee?: number;
  /** Cancellation fee charged when the client cancels an assigned job (PHP). Set at cancellation time. */
  cancellationFee?: number;
  /** Escrow service fee (2%) snapshot locked in at escrow funding (PHP) */
  escrowFee?: number;
  /** Payment processing fee (2%) snapshot locked in at escrow funding (PHP) */
  processingFee?: number;
  /** Client-side platform service fee (5%) snapshot locked in at escrow funding (PHP) */
  platformServiceFee?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Quote ────────────────────────────────────────────────────────────────────

export type QuoteStatus = "pending" | "accepted" | "rejected";

export interface IQuoteMilestone {
  description: string;
  amount: number;
}

export interface IQuote {
  _id: Types.ObjectId | string;
  jobId: Types.ObjectId | string | IJob;
  providerId: Types.ObjectId | string | IUser;
  /** Total proposed price (laborCost + materialsCost when itemised, or direct entry) */
  proposedAmount: number;
  /** Itemised: labour portion */
  laborCost?: number;
  /** Itemised: materials portion */
  materialsCost?: number;
  timeline: string;
  /** Payment milestones attached to this quote */
  milestones?: IQuoteMilestone[];
  /** Additional notes / scope clarification */
  notes?: string;
  /** URL of attached proposal document */
  proposalDocUrl?: string;
  /** Site-inspection photo URLs */
  sitePhotos?: string[];
  message: string;
  status: QuoteStatus;
  /** Timestamp after which the quote is considered expired (set from platform limits.quoteValidityDays). */
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── QuoteTemplate ────────────────────────────────────────────────────────────

export interface IQuoteTemplate {
  _id: Types.ObjectId | string;
  providerId: Types.ObjectId | string | IUser;
  name: string;
  laborCost?: number;
  materialsCost?: number;
  timeline: string;
  milestones?: IQuoteMilestone[];
  notes?: string;
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
  currency?: string;
  commissionRate?: number | null;
  chargeType?: "job_escrow" | "milestone_release" | "partial_release" | "recurring";
  ledgerJournalId?: string | null;
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
  /** True once the dispute status has reached "investigating" — gates the handling fee charge. */
  wasEscalated?: boolean;
  /** Who was charged the case handling fee: client, provider, or both. Set at resolution. */
  losingParty?: "client" | "provider" | "both" | null;
  /** Flat handling fee charged in PHP (0 when not charged). */
  handlingFeeAmount?: number;
  /** True if the wallet deduction for the handling fee succeeded. */
  handlingFeePaid?: boolean;
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
  | "recurring_job_spawned"
  | "job_cancelled"
  | "provider_withdrew"
  | "admin_ledger_entry";

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

export type KnowledgeAudience = "client" | "provider" | "business" | "agency" | "peso" | "both";

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
  | "admin_message"
  | "wallet_credited"
  | "wallet_withdrawal_update"
  | "agency_job_assigned"
  | "agency_staff_invited"
  | "system_notice";

export interface INotification {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    jobId?: string;
    jobTitle?: string;
    quoteId?: string;
    disputeId?: string;
    messageThreadId?: string;
    paymentIntentId?: string;
    payoutId?: string;
    consultationId?: string;
    initiatorId?: string;
    estimateAmount?: number;
    listingId?: string;
    page?: string;
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

// ─── PESO Partner Types ───────────────────────────────────────────────────────

export type PesoVerificationTag = "peso_registered" | "lgu_resident" | "peso_recommended";

export type JobTag = "peso" | "lgu_project" | "gov_program" | "emergency" | "internship";

export interface IPesoCertification {
  title: string;
  issuer: string;
  issuedAt: Date | string;
  expiresAt?: Date | string | null;
  verifiedByPeso?: boolean;
}

export type PesoOfficeType = "city" | "municipal" | "provincial";

export interface IPesoOffice {
  _id: Types.ObjectId | string;
  officeName: string;
  officeType?: PesoOfficeType;
  municipality: string;
  province?: string;
  region: string;
  zipCode?: string;
  contactEmail: string;
  contactPhone?: string;
  contactMobile?: string;
  address?: string;
  website?: string;
  logoUrl?: string;
  headOfficerId: Types.ObjectId | string | IUser;
  officerIds: (Types.ObjectId | string | IUser)[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  // ── PESO fields ────────────────────────────────────────────────
  /** Barangay where the provider is based */
  barangay?: string;
  /** TESDA/PESO certifications and training completions */
  certifications?: IPesoCertification[];
  /** PESO-assigned verification tags */
  pesoVerificationTags?: PesoVerificationTag[];
  /** User ID of the PESO officer who referred this provider */
  pesoReferredBy?: string;
  /** Livelihood program this provider belongs to (e.g. DOLE Kabuhayan) */
  livelihoodProgram?: string;
  /** Account subtype for categorising youth or cooperative providers */
  accountSubtype?: "standard" | "youth" | "cooperative";
  /** LocalPro-issued certification badges earned by completing training courses */
  earnedBadges?: IProviderEarnedBadge[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Training / Upskilling ─────────────────────────────────────────────────────────────

export type TrainingCourseCategory = "basic" | "advanced" | "safety" | "custom";
export type TrainingEnrollmentStatus = "enrolled" | "completed" | "refunded";

export interface IProviderEarnedBadge {
  badgeSlug: string;
  courseTitle: string;
  earnedAt: Date;
}

export interface ITrainingLesson {
  _id: Types.ObjectId | string;
  title: string;
  content: string;           // Markdown
  durationMinutes: number;
  order: number;
}

export interface ITrainingCourse {
  _id: Types.ObjectId | string;
  title: string;
  slug: string;
  description: string;
  category: TrainingCourseCategory;
  price: number;
  durationMinutes: number;
  badgeSlug: string;
  isPublished: boolean;
  lessons: ITrainingLesson[];
  enrollmentCount: number;
  createdBy: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITrainingEnrollment {
  _id: Types.ObjectId | string;
  providerId: Types.ObjectId | string;
  courseId: Types.ObjectId | string | ITrainingCourse;
  courseTitle: string;
  amountPaid: number;
  status: TrainingEnrollmentStatus;
  completedLessons: Array<Types.ObjectId | string>;
  completedAt: Date | null;
  badgeGranted: boolean;
  walletTxId?: string | null;
  paymongoSessionId?: string | null;
  ledgerJournalId?: string | null;
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
  confirmedAt?: Date | null;
  refundedAt?: Date | null;
  /** PayMongo webhook event ID for idempotency */
  webhookEventId?: string | null;
  /** Double-entry ledger journal ID (escrow_funded_gateway) */
  ledgerJournalId?: string | null;
  /** Non-refundable escrow service fee charged to the client (PHP). Default 0 for legacy records. */
  escrowFee?: number;
  /** Non-refundable payment processing fee charged to the client (PHP). Default 0 for legacy records. */
  processingFee?: number;
  /** Flat urgent booking fee charged at checkout (PHP). Non-refundable. Default 0 for legacy records. */
  urgencyFee?: number;
  /** Non-refundable client-side platform service fee charged at checkout (PHP). Default 0 for legacy records. */
  platformServiceFee?: number;
  /** Total amount charged at checkout = amount (service price) + escrowFee + processingFee + urgencyFee + platformServiceFee (PHP). */
  totalCharge?: number;
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
  currency?: string;
  ledgerJournalId?: string | null;
  /** L21: Journal ID for the rejection ledger reversal. Stored separately to preserve the original ledgerJournalId. */
  rejectionJournalId?: string | null;
  /** Flat withdrawal fee deducted from the payout amount (PHP). Net to provider = amount − withdrawalFee. */
  withdrawalFee?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface IWallet {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string | IUser;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export type WalletTxType =
  | "refund_credit"
  | "escrow_payment"
  | "withdrawal"
  | "withdrawal_reversed"
  | "topup"
  | "admin_credit"
  | "admin_debit";

export interface IWalletTransaction {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string | IUser;
  type: WalletTxType;
  amount: number;
  balanceAfter: number;
  description: string;
  jobId?: Types.ObjectId | string | null;
  refId?: string | null;
  ledgerJournalId?: string | null;
  createdAt: Date;
}

export type WalletWithdrawalStatus = "pending" | "processing" | "completed" | "rejected";

export interface IWalletWithdrawal {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string | IUser;
  amount: number;
  status: WalletWithdrawalStatus;
  bankName: string;
  accountNumber: string;
  accountName: string;
  notes?: string | null;
  processedAt?: Date | null;
  ledgerJournalId?: string | null;
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

// ─── Business Organization ────────────────────────────────────────────────────

export type BusinessType = "hotel" | "company" | "other";
export type BusinessMemberRole = "owner" | "manager" | "supervisor" | "finance";

export interface IBusinessLocation {
  _id: Types.ObjectId | string;
  label: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  /** Allocated monthly budget for this location in PHP */
  monthlyBudget: number;
  isActive: boolean;
  /** Budget alert threshold 0-100 (default 80) */
  alertThreshold: number;
  /** Pinned provider IDs for this location */
  preferredProviderIds: (Types.ObjectId | string)[];
  /** Assigned branch manager user ID */
  managerId?: Types.ObjectId | string | null;
  /** Allowed service categories for this location */
  allowedCategories: string[];
}

export type BusinessPlan = "starter" | "growth" | "pro" | "enterprise";
export type BusinessPlanStatus = "active" | "past_due" | "cancelled";

export interface IBusinessOrganization {
  _id: Types.ObjectId | string;
  ownerId: Types.ObjectId | string | IUser;
  name: string;
  type: BusinessType;
  logo?: string | null;
  locations: IBusinessLocation[];
  defaultMonthlyBudget: number;
  /** Subscription plan */
  plan: BusinessPlan;
  planStatus: BusinessPlanStatus;
  planActivatedAt?: Date | null;
  planExpiresAt?: Date | null;
  /** PayMongo checkout session ID for pending upgrade */
  pendingPlanSessionId?: string | null;
  pendingPlan?: BusinessPlan | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBusinessMember {
  _id: Types.ObjectId | string;
  orgId: Types.ObjectId | string | IBusinessOrganization;
  userId: Types.ObjectId | string | IUser;
  role: BusinessMemberRole;
  /** Which location IDs this member can manage; empty = all locations */
  locationAccess: (Types.ObjectId | string)[];
  invitedBy: Types.ObjectId | string | IUser;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Business Analytics ───────────────────────────────────────────────────────

export interface MonthlyExpenseRow {
  /** "YYYY-MM" */
  month: string;
  locationId: string | null;
  locationLabel: string;
  totalSpend: number;
  jobCount: number;
  /** Spend by service category */
  categoryBreakdown: Record<string, number>;
  /** % change vs previous month (null for first row) */
  momChange: number | null;
}

export interface ProviderPerformanceRow {
  providerId: string;
  providerName: string;
  providerAvatar?: string | null;
  completedJobs: number;
  avgRating: number;
  totalSpend: number;
  /** % of assigned jobs with delays (started after scheduleDate) */
  delayFrequency: number;
  /** Number of disputes involving this provider for org jobs */
  disputeCount: number;
  /** 0-100 composite score: rating * completion rate / avg cost factor */
  costEfficiencyScore: number;
  /** Whether this provider is on the org's preferred vendor list */
  isPreferred: boolean;
}

export interface BudgetAlertRow {
  locationId: string;
  locationLabel: string;
  budgetTotal: number;
  spentThisMonth: number;
  pct: number;
  /** 'ok' | 'warning' (≥threshold) | 'critical' (≥90%) */
  status: 'ok' | 'warning' | 'critical';
  threshold: number;
}

// ─── Featured Listing ─────────────────────────────────────────────────────────

export type FeaturedListingType =
  | "featured_provider"   // Provider appears at top of search results with a "Featured" badge
  | "top_search"          // Provider pinned to top of category search pages
  | "homepage_highlight"; // Provider card displayed in the homepage highlight strip

export type FeaturedListingStatus = "active" | "expired" | "cancelled";

export interface IFeaturedListing {
  _id?: string;
  /** The provider (User._id) who purchased this boost */
  providerId: string;
  type: FeaturedListingType;
  status: FeaturedListingStatus;
  /** UTC timestamp when the boost became active */
  startsAt: Date;
  /** UTC timestamp when the boost expires (startsAt + 7 days) */
  expiresAt: Date;
  /** PHP amount charged for this listing (snapshot of price at purchase time) */
  amountPaid: number;
  /** WalletTransaction._id — set when paid via wallet */
  walletTxId?: string | null;
  /** PayMongo checkout session ID — set when paid via gateway */
  paymongoSessionId?: string | null;
  /** Ledger journal ID linking to the double-entry record */
  ledgerJournalId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Pricing config constants (mirrors AppSettings defaults; used client-side) */
export const FEATURED_LISTING_PRICES: Record<FeaturedListingType, number> = {
  featured_provider:  199,
  top_search:         299,
  homepage_highlight: 499,
} as const;

export const FEATURED_LISTING_LABELS: Record<FeaturedListingType, string> = {
  featured_provider:  "Featured Provider",
  top_search:         "Top Search Placement",
  homepage_highlight: "Homepage Highlight",
} as const;

export const FEATURED_LISTING_DESCRIPTIONS: Record<FeaturedListingType, string> = {
  featured_provider:  "Appear at the top of marketplace search results with a 'Featured' badge, boosting click-through rates.",
  top_search:         "Your profile is pinned at the top of category-filtered searches so clients see you first.",
  homepage_highlight: "Your provider card is shown in the featured strip on the homepage, reaching all active clients.",
} as const;
