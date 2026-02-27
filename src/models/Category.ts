import mongoose, { Schema, Document, Model } from "mongoose";
import type { ICategory } from "@/types";

export interface CategoryDocument extends Omit<ICategory, "_id">, Document {}

const CategorySchema = new Schema<CategoryDocument>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      maxlength: [60, "Name cannot exceed 60 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    icon: { type: String, default: "🔧" },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Auto-generate slug from name before save
CategorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }
  next();
});

const Category: Model<CategoryDocument> =
  mongoose.models.Category ?? mongoose.model<CategoryDocument>("Category", CategorySchema);

export default Category;

// ─── Seed data ────────────────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES = [
  { name: "Plumbing",     icon: "🔧", order: 0 },
  { name: "Electrical",   icon: "⚡", order: 1 },
  { name: "Cleaning",     icon: "🧹", order: 2 },
  { name: "Landscaping",  icon: "🌿", order: 3 },
  { name: "Carpentry",    icon: "🪚", order: 4 },
  { name: "Painting",     icon: "🎨", order: 5 },
  { name: "Roofing",      icon: "🏠", order: 6 },
  { name: "HVAC",         icon: "❄️", order: 7 },
  { name: "Moving",       icon: "📦", order: 8 },
  { name: "Handyman",     icon: "🛠️", order: 9 },
  { name: "Other",        icon: "📋", order: 10 },
];
