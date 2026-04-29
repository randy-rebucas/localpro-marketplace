/**
 * File-based article mutations.
 * The `id` param is encoded as `${folder}__${slug}`, e.g. "client__getting-started".
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler } from "@/lib/utils";
import { requireUser, requireRole } from "@/lib/auth";
import {
  getArticle,
  writeArticle,
  deleteArticleFile,
  slugExists,
} from "@/lib/knowledge";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/errors";
import type { KnowledgeFolder } from "@/lib/knowledge";

import { checkRateLimit } from "@/lib/rateLimit";
const FOLDERS = ["client", "provider", "business", "agency", "peso"] as const;

const UpdateSchema = z.object({
  title:   z.string().min(2).max(200).optional(),
  excerpt: z.string().min(2).max(500).optional(),
  content: z.string().min(1).optional(),
  group:   z.string().min(2).max(100).optional(),
  order:   z.number().int().optional(),
  folder:  z.enum(FOLDERS).optional(), // moving to a different folder
});

type RouteContext = { params: Promise<{ id: string }> };

function parseId(id: string): { folder: KnowledgeFolder; slug: string } {
  const sep = id.indexOf("__");
  if (sep === -1) throw new ValidationError("Invalid article id");
  const folder = id.slice(0, sep) as KnowledgeFolder;
  const slug = id.slice(sep + 2);
  const valid = ["client", "provider", "business", "agency", "peso"];
  if (!valid.includes(folder)) throw new ValidationError("Invalid folder in id");
  return { folder, slug };
}

function serializeArticle(a: ReturnType<typeof getArticle>, folder: KnowledgeFolder) {
  if (!a) return null;
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

export const PUT = withHandler(async (req: NextRequest, ctx: RouteContext) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await ctx.params;
  const { folder: srcFolder, slug } = parseId(id);

  const existing = getArticle(srcFolder, slug);
  if (!existing) throw new NotFoundError("Article not found");

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { folder: destFolder, ...fields } = parsed.data;

  const merged = {
    title:    fields.title   ?? existing.title,
    excerpt:  fields.excerpt ?? existing.excerpt,
    content:  fields.content ?? existing.content,
    group:    fields.group   ?? existing.group,
    order:    fields.order   ?? existing.order,
    audience: (destFolder ?? srcFolder) as KnowledgeFolder,
  };

  // Moving to a different folder — delete from old folder first
  if (destFolder && destFolder !== srcFolder) {
    if (slugExists(destFolder, slug)) {
      throw new ConflictError(`Slug "${slug}" already exists in ${destFolder}`);
    }
    deleteArticleFile(srcFolder, slug);
  }

  const targetFolder = (destFolder ?? srcFolder) as KnowledgeFolder;
  const article = writeArticle(targetFolder, slug, merged);

  return NextResponse.json({ article: serializeArticle(article, targetFolder) });
});

export const DELETE = withHandler(async (_req: NextRequest, ctx: RouteContext) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await ctx.params;
  const { folder, slug } = parseId(id);

  const deleted = deleteArticleFile(folder, slug);
  if (!deleted) throw new NotFoundError("Article not found");

  return NextResponse.json({ success: true });
});
