import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError } from "@/lib/errors";
import { knowledgeArticleRepository } from "@/repositories/knowledgeArticle.repository";

/** GET /api/knowledge — published articles for the current user's role */
export const GET = withHandler(async () => {
  const user = await requireUser();

  if (user.role !== "client" && user.role !== "provider") {
    throw new ForbiddenError();
  }

  const docs = await knowledgeArticleRepository.findPublishedForAudience(user.role);

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
