import mongoose, { Schema, Document, Model } from "mongoose";
import type { IFeaturedListing, FeaturedListingType, FeaturedListingStatus } from "@/types";

export interface FeaturedListingDocument
  extends Omit<IFeaturedListing, "_id" | "providerId" | "walletTxId">,
    Document {
  providerId: mongoose.Types.ObjectId | string;
  walletTxId?: mongoose.Types.ObjectId | string | null;
}

const FeaturedListingSchema = new Schema<FeaturedListingDocument>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["featured_provider", "top_search", "homepage_highlight"] as FeaturedListingType[],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"] as FeaturedListingStatus[],
      default: "active",
      index: true,
    },
    startsAt:  { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    amountPaid:       { type: Number, required: true, min: 0 },
    /** Set when paid via wallet debit */
    walletTxId:       { type: Schema.Types.ObjectId, ref: "WalletTransaction", default: null },
    /** Set when paid via PayMongo checkout */
    paymongoSessionId: { type: String, default: null },
    ledgerJournalId:  { type: String, default: null },
  },
  { timestamps: true }
);

// Compound indexes for common query patterns
FeaturedListingSchema.index({ providerId: 1, status: 1 });
FeaturedListingSchema.index({ status: 1, expiresAt: 1 });
FeaturedListingSchema.index({ type: 1, status: 1, expiresAt: 1 });

const FeaturedListing: Model<FeaturedListingDocument> =
  mongoose.models.FeaturedListing ??
  mongoose.model<FeaturedListingDocument>("FeaturedListing", FeaturedListingSchema);

export default FeaturedListing;
