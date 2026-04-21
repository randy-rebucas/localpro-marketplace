import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAIFeedback extends Document {
  // Reference to AI decision
  decisionId: mongoose.Types.ObjectId;
  agentName: string;
  decisionType: string;
  
  // Feedback
  wasCorrect: boolean; // Did the AI make the right decision?
  userNotes?: string; // Why user approved/rejected
  userOverride?: boolean; // Did user override AI recommendation?
  overrideReason?: string; // Why override
  
  // Outcome tracking
  actualOutcome?: string; // What actually happened
  customerFeedback?: string;
  issueResolved: boolean;
  
  // Retraining signals
  confidenceAccuracy?: {
    aiConfidence: number;
    wasCorrect: boolean; // Did AI get this right?
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const AIFeedbackSchema = new Schema<IAIFeedback>(
  {
    decisionId: {
      type: Schema.Types.ObjectId,
      ref: "AIDecision",
      required: true,
      index: true,
    },
    agentName: {
      type: String,
      required: true,
    },
    decisionType: {
      type: String,
      required: true,
    },
    wasCorrect: {
      type: Boolean,
      required: true,
    },
    userNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    userOverride: {
      type: Boolean,
      default: false,
    },
    overrideReason: String,
    actualOutcome: String,
    customerFeedback: String,
    issueResolved: {
      type: Boolean,
      default: false,
    },
    confidenceAccuracy: {
      aiConfidence: Number,
      wasCorrect: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes
AIFeedbackSchema.index({ agentName: 1, wasCorrect: 1 });
AIFeedbackSchema.index({ userOverride: 1, createdAt: -1 });

let AIFeedbackModel: Model<IAIFeedback>;

try {
  AIFeedbackModel = mongoose.model<IAIFeedback>("AIFeedback");
} catch {
  AIFeedbackModel = mongoose.model<IAIFeedback>("AIFeedback", AIFeedbackSchema);
}

export { AIFeedbackModel };
