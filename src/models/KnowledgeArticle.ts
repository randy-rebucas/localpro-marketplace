import mongoose, { Schema, Document, Model } from "mongoose";
import type { IKnowledgeArticle } from "@/types";

export interface KnowledgeArticleDocument
  extends Omit<IKnowledgeArticle, "_id">,
    Document {}

const KnowledgeArticleSchema = new Schema<KnowledgeArticleDocument>(
  {
    title:       { type: String, required: true, trim: true },
    excerpt:     { type: String, required: true, trim: true },
    content:     { type: String, required: true },
    group:       { type: String, required: true, trim: true },
    audience:    { type: String, enum: ["client", "provider", "both"], required: true },
    order:       { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true, index: true },
    createdBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

KnowledgeArticleSchema.index({ audience: 1, isPublished: 1, group: 1, order: 1 });

const KnowledgeArticle: Model<KnowledgeArticleDocument> =
  mongoose.models.KnowledgeArticle ??
  mongoose.model<KnowledgeArticleDocument>(
    "KnowledgeArticle",
    KnowledgeArticleSchema
  );

export default KnowledgeArticle;
