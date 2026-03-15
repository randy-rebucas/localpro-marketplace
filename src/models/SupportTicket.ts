import mongoose, { Schema, Document, Model } from "mongoose";

export type SupportTicketStatus   = "open" | "in_progress" | "resolved" | "closed";
export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";
export type SupportTicketCategory =
  | "billing"
  | "account"
  | "dispute"
  | "technical"
  | "kyc"
  | "payout"
  | "other";

export interface ISupportTicket extends Document {
  /** Human-readable auto-incremented ticket number (e.g. "LP-1042") */
  ticketNumber:     string;
  userId:           mongoose.Types.ObjectId;
  subject:          string;
  category:         SupportTicketCategory;
  status:           SupportTicketStatus;
  priority:         SupportTicketPriority;
  /** First message body (subsequent messages are stored as chat thread messages) */
  body:             string;
  /** Admin/staff user ID who is handling the ticket */
  assignedTo?:      mongoose.Types.ObjectId;
  /** Related dispute ID, if this ticket was escalated from a dispute */
  relatedDisputeId?: mongoose.Types.ObjectId;
  /** Related job ID, if applicable */
  relatedJobId?:    mongoose.Types.ObjectId;
  /** Computed SLA deadline based on priority and creation time */
  slaDeadline?:     Date;
  /** Whether SLA has been breached */
  slaBreach:        boolean;
  /** CSAT rating (1–5) provided by user after ticket closes */
  csatScore?:       number;
  resolvedAt?:      Date;
  closedAt?:        Date;
  createdAt:        Date;
  updatedAt:        Date;
}

// ── SLA minutes by priority ───────────────────────────────────────────────────
const SLA_MINUTES: Record<SupportTicketPriority, number> = {
  urgent: 4 * 60,   // 4 hours
  high:   24 * 60,  // 24 hours
  normal: 48 * 60,  // 48 hours
  low:    72 * 60,  // 72 hours
};

// ── Auto-increment counter ────────────────────────────────────────────────────
let ticketCounter = 0;
async function getNextTicketNumber(): Promise<string> {
  // Use Mongoose to atomically increment — fetches the current max and adds 1
  const Model = mongoose.models["SupportTicket"] as Model<ISupportTicket> | undefined;
  if (!Model) {
    ticketCounter++;
    return `LP-${String(ticketCounter).padStart(4, "0")}`;
  }
  const last = await Model.findOne({}, { ticketNumber: 1 }).sort({ createdAt: -1 }).lean();
  if (last?.ticketNumber) {
    const num = parseInt(last.ticketNumber.replace("LP-", ""), 10);
    return `LP-${String((isNaN(num) ? 0 : num) + 1).padStart(4, "0")}`;
  }
  return "LP-0001";
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber:     { type: String, unique: true, index: true },
    userId:           { type: Schema.Types.ObjectId, ref: "User",    required: true, index: true },
    subject:          { type: String, required: true, maxlength: 255 },
    category:         {
      type:    String,
      enum:    ["billing", "account", "dispute", "technical", "kyc", "payout", "other"] as SupportTicketCategory[],
      default: "other",
    },
    status:           {
      type:    String,
      enum:    ["open", "in_progress", "resolved", "closed"] as SupportTicketStatus[],
      default: "open",
      index:   true,
    },
    priority:         {
      type:    String,
      enum:    ["low", "normal", "high", "urgent"] as SupportTicketPriority[],
      default: "normal",
    },
    body:             { type: String, required: true, maxlength: 5000 },
    assignedTo:       { type: Schema.Types.ObjectId, ref: "User" },
    relatedDisputeId: { type: Schema.Types.ObjectId, ref: "Dispute" },
    relatedJobId:     { type: Schema.Types.ObjectId, ref: "Job" },
    slaDeadline:      { type: Date },
    slaBreach:        { type: Boolean, default: false },
    csatScore:        { type: Number, min: 1, max: 5 },
    resolvedAt:       { type: Date },
    closedAt:         { type: Date },
  },
  { timestamps: true }
);

// ── Pre-save: assign ticketNumber + slaDeadline on creation ──────────────────
SupportTicketSchema.pre("save", async function (next) {
  if (this.isNew) {
    if (!this.ticketNumber) {
      this.ticketNumber = await getNextTicketNumber();
    }
    if (!this.slaDeadline) {
      const slaMs   = SLA_MINUTES[this.priority as SupportTicketPriority] * 60_000;
      this.slaDeadline = new Date(Date.now() + slaMs);
    }
  }

  // Mark SLA breach
  if (this.slaDeadline && this.status !== "resolved" && this.status !== "closed") {
    this.slaBreach = Date.now() > this.slaDeadline.getTime();
  }

  next();
});

// ── Indexes ───────────────────────────────────────────────────────────────────
SupportTicketSchema.index({ status: 1, createdAt: -1 });
SupportTicketSchema.index({ slaBreach: 1, status: 1 });
SupportTicketSchema.index({ assignedTo: 1, status: 1 });

const SupportTicket: Model<ISupportTicket> =
  mongoose.models["SupportTicket"] ??
  mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);

export default SupportTicket;
