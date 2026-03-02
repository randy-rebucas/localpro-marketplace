import { connectDB } from "@/lib/db";
import KnowledgeArticle from "@/models/KnowledgeArticle";
import type { KnowledgeAudience } from "@/types";

export const knowledgeArticleRepository = {
  /** Published articles visible to a role (audience = role or "both"). */
  async findPublishedForAudience(role: "client" | "provider") {
    await connectDB();
    return KnowledgeArticle.find({
      isPublished: true,
      audience: { $in: [role, "both"] },
    })
      .sort({ group: 1, order: 1, createdAt: 1 })
      .lean();
  },

  async findById(id: string) {
    await connectDB();
    return KnowledgeArticle.findById(id).lean();
  },

  /** All articles (admin view). */
  async findAll() {
    await connectDB();
    return KnowledgeArticle.find()
      .sort({ audience: 1, group: 1, order: 1 })
      .lean();
  },

  async create(data: {
    title: string;
    excerpt: string;
    content: string;
    group: string;
    audience: KnowledgeAudience;
    order: number;
    isPublished: boolean;
    createdBy: string;
  }) {
    await connectDB();
    const doc = await KnowledgeArticle.create(data);
    return doc.toObject();
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      excerpt: string;
      content: string;
      group: string;
      audience: KnowledgeAudience;
      order: number;
      isPublished: boolean;
    }>
  ) {
    await connectDB();
    return KnowledgeArticle.findByIdAndUpdate(id, data, { new: true }).lean();
  },

  async delete(id: string) {
    await connectDB();
    return KnowledgeArticle.findByIdAndDelete(id).lean();
  },
};
