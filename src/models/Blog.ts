import mongoose, { Schema, Document, Model } from "mongoose";
import type { Types } from "mongoose";

/**
 * Blog Article Document Interface
 */
/**
 * Blog Category
 */
export type BlogCategory = 
  | "news"
  | "tutorial"
  | "tips-tricks"
  | "service-update"
  | "provider-story"
  | "client-story"
  | "industry-insights"
  | "announcement"
  | "other";

/**
 * Populated author object when using populate("author")
 */
export interface PopulatedAuthor {
  _id: Types.ObjectId | string;
  name: string;
  email: string;
}

export interface IBlog {
  _id?: Types.ObjectId | string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage?: string;
  author: Types.ObjectId | string | PopulatedAuthor;
  status: "draft" | "published" | "scheduled" | "archived";
  publishedAt?: Date;
  scheduledFor?: Date;
  category?: BlogCategory;
  metaDescription?: string;
  keywords?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
  deletedAt?: Date | null;
}

export interface BlogDocument extends Omit<IBlog, "_id">, Document {}

const BlogSchema = new Schema<BlogDocument>(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: [true, "Blog slug is required"],
      unique: true,
      sparse: false,
      trim: true,
      lowercase: true,
      index: true,
      description: "URL-friendly slug for accessing this blog",
    },
    content: {
      type: String,
      required: [true, "Blog content is required"],
      minlength: [10, "Content must be at least 10 characters"],
      description: "Rich text content (supports markdown or HTML)",
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [500, "Excerpt cannot exceed 500 characters"],
      description: "Short summary for blog listing",
    },
    featuredImage: {
      type: String,
      default: null,
      description: "Cloudinary URL for featured image",
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
      description: "Admin/Staff user who created/maintaining this blog",
    },
    status: {
      type: String,
      enum: ["draft", "published", "scheduled", "archived"],
      default: "draft",
      index: true,
      description: "draft: Not published | published: Live | scheduled: Future publish | archived: Hidden",
    },
    publishedAt: {
      type: Date,
      default: null,
      description: "When the blog was published (set automatically on publish)",
    },
    scheduledFor: {
      type: Date,
      default: null,
      description: "When to automatically publish (future date for scheduled blogs)",
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, "Meta description for SEO (typically shown in search results)"],
      default: null,
    },
    category: {
      type: String,
      enum: ["news", "tutorial", "tips-tricks", "service-update", "provider-story", "client-story", "industry-insights", "announcement", "other"],
      default: "other",
      description: "Blog article category",
      index: true,
    },
    keywords: {
      type: [String],
      default: [],
      description: "SEO keywords",
    },
    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Auto-generate slug from title on creation/update
 * Slug is regenerated from title only if:
 * - Blog is new (creation), OR
 * - Title is modified AND slug is not explicitly provided
 */
BlogSchema.pre<BlogDocument>("save", function (next) {
  // Generate slug from title if not explicitly set
  if (!this.slug || (this.isModified("title") && !this.isModified("slug"))) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  }

  // Auto-set publishedAt when transitioning to published
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

/**
 * Indexes for common queries
 */
BlogSchema.index({ status: 1, publishedAt: -1 }); // For listing published blogs
BlogSchema.index({ category: 1, publishedAt: -1 }); // For category browsing
BlogSchema.index({ author: 1, createdAt: -1 }); // For author's blogs
// Compound index: slug + isDeleted to allow slug reuse for non-deleted blogs only
BlogSchema.index({ slug: 1, isDeleted: 1 }, { unique: true, sparse: true }); // Lookup by slug, exclude deleted

const Blog: Model<BlogDocument> =
  mongoose.models.Blog || mongoose.model<BlogDocument>("Blog", BlogSchema);

export default Blog;
