import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError } from "@/lib/errors";
import { knowledgeArticleRepository } from "@/repositories/knowledgeArticle.repository";
import { checkRateLimit } from "@/lib/rateLimit";

/** GET /api/knowledge — published articles for the current user's role */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`knowledge-list:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

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
