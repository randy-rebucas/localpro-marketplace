import mongoose, { Schema, Document, Model } from "mongoose";

// All 11 AI agents across all phases
export type AIAgentName = 
  | "support_agent"
  | "operations_manager"
  | "dispute_resolver"
  | "kyc_verifier"
  | "fraud_detector"
  | "sales_agent"
  | "booking_optimizer"
  | "escrow_manager"
  | "proactive_support"
  | "review_moderator"
  | "outreach_agent";

// Decision types for all agents
export type AIDecisionType = 
  | "VALIDATION"
  | "DISPUTE"
  | "PAYOUT"
  | "SUPPORT"
  | "LEAD_SCORING"
  | "KYC_VERIFICATION"
  | "FRAUD_CHECK"
  | "BOOKING_MATCH"
  | "ESCROW_RELEASE"
  | "RISK_DETECTION"
  | "REVIEW_MODERATION"
  | "OUTREACH_DECISION";

export type AIDecisionStatus = "pending_review" | "approved" | "rejected" | "escalated";
export type AIRiskLevel = "low" | "medium" | "high" | "critical";

export interface IAIDecision extends Document {
  // Core decision info
  type: AIDecisionType;
  agentName: AIAgentName;
  status: AIDecisionStatus;
  
  // AI recommendation
  recommendation: string;
  confidenceScore: number; // 0-100
  riskLevel: AIRiskLevel;
  
  // Supporting context
  supportingEvidence?: {
    fraudScore?: number;
    behavioralFlags?: string[];
    patternDetected?: string;
    photoEvidence?: string[]; // URLs for dispute evidence
    customerSentiment?: "positive" | "neutral" | "negative";
    sentimentScore?: number; // 0-1
  };
  
  // Related entity
  relatedEntityType?: "job" | "dispute" | "payout" | "ticket" | "lead" | "user";
  relatedEntityId?: mongoose.Types.ObjectId;
  
  // Resolution
  approvedBy?: mongoose.Types.ObjectId; // User who approved
  rejectedBy?: mongoose.Types.ObjectId; // User who rejected
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  escalatedReason?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const AIDecisionSchema = new Schema<IAIDecision>(
  {
    type: {
      type: String,
      enum: [
        "VALIDATION",
        "DISPUTE",
        "PAYOUT",
        "SUPPORT",
        "LEAD_SCORING",
        "KYC_VERIFICATION",
        "FRAUD_CHECK",
        "BOOKING_MATCH",
        "ESCROW_RELEASE",
        "RISK_DETECTION",
        "REVIEW_MODERATION",
        "OUTREACH_DECISION",
      ],
      required: true,
      index: true,
    },
    agentName: {
      type: String,
      enum: [
        "support_agent",
        "operations_manager",
        "dispute_resolver",
        "kyc_verifier",
        "fraud_detector",
        "sales_agent",
        "booking_optimizer",
        "escrow_manager",
        "proactive_support",
        "review_moderator",
        "outreach_agent",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected", "escalated"],
      default: "pending_review",
      index: true,
    },
    recommendation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    supportingEvidence: {
      fraudScore: Number,
      behavioralFlags: [String],
      patternDetected: String,
      photoEvidence: [String],
      customerSentiment: {
        type: String,
        enum: ["positive", "neutral", "negative"],
      },
      sentimentScore: Number,
    },
    relatedEntityType: {
      type: String,
      enum: ["job", "dispute", "payout", "ticket", "lead", "user"],
    },
    relatedEntityId: Schema.Types.ObjectId,
    
    approvedBy: Schema.Types.ObjectId,
    rejectedBy: Schema.Types.ObjectId,
    approvedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    escalatedReason: String,
  },
  {
    timestamps: true,
  }
);

// Add indexes
AIDecisionSchema.index({ status: 1, createdAt: -1 });
AIDecisionSchema.index({ agentName: 1, status: 1 });
AIDecisionSchema.index({ riskLevel: 1, confidenceScore: 1 });
AIDecisionSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });

let AIDecisionModel: Model<IAIDecision>;

try {
  AIDecisionModel = mongoose.model<IAIDecision>("AIDecision");
} catch {
  AIDecisionModel = mongoose.model<IAIDecision>("AIDecision", AIDecisionSchema);
}

export { AIDecisionModel };
