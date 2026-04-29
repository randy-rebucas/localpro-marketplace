import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError, ForbiddenError, assertObjectId } from "@/lib/errors";
import { knowledgeArticleRepository } from "@/repositories/knowledgeArticle.repository";
import { checkRateLimit } from "@/lib/rateLimit";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/knowledge/[id] — single published article */
export const GET = withHandler(async (_req: NextRequest, ctx: RouteContext) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  assertObjectId(id, "id");

  const rl = await checkRateLimit(`knowledge-get:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const doc = await knowledgeArticleRepository.findById(id);
  if (!doc || !doc.isPublished) throw new NotFoundError("Article not found");

  // Audience check: each role may only read articles targeted at them or "both"
  const roleAudienceMap: Record<string, string[]> = {
    client:   ["client", "both"],
    provider: ["provider", "both"],
    business: ["business", "both"],
    agency:   ["agency", "both"],
    peso:     ["peso", "both"],
  };
  const allowed = roleAudienceMap[user.role] ?? [];
  if (!allowed.includes(doc.audience as string)) throw new ForbiddenError();

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
