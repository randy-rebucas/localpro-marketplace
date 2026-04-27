import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler } from "@/lib/utils";
import { requireUser, requireRole } from "@/lib/auth";
import {
  getAllArticles,
  writeArticle,
  slugify,
  slugExists,
  isValidSlug,
  type KnowledgeFolder,
} from "@/lib/knowledge";
import { ValidationError, ConflictError } from "@/lib/errors";

import { checkRateLimit } from "@/lib/rateLimit";
const FOLDERS = ["client", "provider", "business", "agency", "peso"] as const;

const CreateSchema = z.object({
  folder:  z.enum(FOLDERS),
  slug:    z.string().min(1).max(100).optional(), // auto-generated from title if omitted
  title:   z.string().min(2).max(200),
  excerpt: z.string().min(2).max(500),
  content: z.string().min(1),
  group:   z.string().min(2).max(100),
  order:   z.number().int().default(0),
});

function serializeArticle(
  a: ReturnType<typeof writeArticle>,
  folder: KnowledgeFolder
) {
  return {
    id:        `${folder}__${a.slug}`,
    slug:      a.slug,
    folder,
    title:     a.title,
    excerpt:   a.excerpt,
    content:   a.content,
    group:     a.group,
    order:     a.order,
    audience:  a.audience,
    updatedAt: a.updatedAt,
  };
}

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin", "staff");

  const articles = getAllArticles().map((a) =>
    serializeArticle(a, a.folder)
  );

  return NextResponse.json({ articles });
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { folder, slug: rawSlug, ...rest } = parsed.data;

  // Generate slug from title if not provided
  const slug = rawSlug ? slugify(rawSlug) : slugify(rest.title);
  if (!isValidSlug(slug)) throw new ValidationError("Invalid slug — use only lowercase letters, numbers, and hyphens");
  if (slugExists(folder, slug)) throw new ConflictError(`An article with slug "${slug}" already exists in ${folder}`);

  const article = writeArticle(folder, slug, { ...rest, audience: folder });

  return NextResponse.json(
    { article: serializeArticle(article, folder) },
    { status: 201 }
  );
});
