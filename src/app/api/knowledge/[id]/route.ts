import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { knowledgeArticleRepository } from "@/repositories/knowledgeArticle.repository";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/knowledge/[id] — single published article */
export const GET = withHandler(async (_req: NextRequest, ctx: RouteContext) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const doc = await knowledgeArticleRepository.findById(id);
  if (!doc || !doc.isPublished) throw new NotFoundError("Article not found");

  // Audience check: client sees client/both, provider sees provider/both
  if (user.role === "client" && doc.audience === "provider") throw new ForbiddenError();
  if (user.role === "provider" && doc.audience === "client") throw new ForbiddenError();

  return NextResponse.json({
    article: {
      _id:       String(doc._id),
      title:     doc.title,
      excerpt:   doc.excerpt,
      content:   doc.content,
      group:     doc.group,
      audience:  doc.audience,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    },
  });
});
