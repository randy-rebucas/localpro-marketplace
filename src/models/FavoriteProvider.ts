import mongoose, { Schema, Document, Model } from "mongoose";
import type { IFavoriteProvider } from "@/types";

export interface FavoriteProviderDocument
  extends Omit<IFavoriteProvider, "_id">,
    Document {}

const FavoriteProviderSchema = new Schema<FavoriteProviderDocument>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One entry per client-provider pair
FavoriteProviderSchema.index({ clientId: 1, providerId: 1 }, { unique: true });

const FavoriteProvider: Model<FavoriteProviderDocument> =
  mongoose.models.FavoriteProvider ??
  mongoose.model<FavoriteProviderDocument>(
    "FavoriteProvider",
    FavoriteProviderSchema
  );

export default FavoriteProvider;
