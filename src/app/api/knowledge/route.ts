import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError } from "@/lib/errors";
import { knowledgeArticleRepository } from "@/repositories/knowledgeArticle.repository";

/** GET /api/knowledge — published articles for the current user's role */
export const GET = withHandler(async () => {
  const user = await requireUser();

  const ALLOWED_ROLES = ["client", "provider", "business", "agency", "peso"];
  if (!ALLOWED_ROLES.includes(user.role)) {
    throw new ForbiddenError();
  }

  // Map role to the folder name (all map 1-to-1 now)
  const folder = user.role as "client" | "provider" | "business" | "agency" | "peso";
  const docs = await knowledgeArticleRepository.findPublishedForAudience(folder);

  const articles = docs.map((a) => ({
    _id:         String(a._id),
    title:       a.title,
    excerpt:     a.excerpt,
    group:       a.group,
    audience:    a.audience,
    order:       a.order,
    createdAt:   a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  }));

  return NextResponse.json({ articles });
});
