import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler, apiResponse } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { blogRepository } from "@/repositories";

import { checkRateLimit } from "@/lib/rateLimit";
/**
 * Validation Schemas
 */
const CreateBlogSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(1).max(200),
  content: z.string().min(10),
  excerpt: z.string().max(500).optional(),
  featuredImage: z.string().url().optional().nullable().or(z.literal("")),
  category: z.enum(["news", "tutorial", "tips-tricks", "service-update", "provider-story", "client-story", "industry-insights", "announcement", "other"]).default("other"),
  metaDescription: z.string().max(160).optional(),
  keywords: z.array(z.string()).default([]),
});

const UpdateBlogSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  content: z.string().min(10).optional(),
  excerpt: z.string().max(500).optional(),
  featuredImage: z.string().url().optional().nullable().or(z.literal("")),
  category: z.enum(["news", "tutorial", "tips-tricks", "service-update", "provider-story", "client-story", "industry-insights", "announcement", "other"]).optional(),
  metaDescription: z.string().max(160).optional(),
  keywords: z.array(z.string()).optional(),
  status: z.enum(["draft", "published", "scheduled", "archived"]).optional(),
  scheduledFor: z.string().datetime().optional().nullable(),
});

const VALID_BLOG_STATUSES = ["draft", "published", "scheduled", "archived"] as const;
type BlogStatus = typeof VALID_BLOG_STATUSES[number];

/**
 * GET /api/admin/blogs
 * List all blogs with pagination and filters
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCapability(user, "manage_blogs");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const rawStatus = searchParams.get("status") ?? "";
  const status: BlogStatus | undefined = VALID_BLOG_STATUSES.includes(rawStatus as BlogStatus)
    ? (rawStatus as BlogStatus)
    : undefined;
  const search = searchParams.get("search");

  const result = await blogRepository.findAll({
    page,
    limit,
    status,
    search: search ?? undefined,
    author: user.userId,
  });

  return apiResponse({ data: result });
});

/**
 * POST /api/admin/blogs
 * Create new blog (initial status: draft)
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCapability(user, "manage_blogs");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const validated = CreateBlogSchema.parse(body);

  const blog = await blogRepository.create({
    ...validated,
    featuredImage: validated.featuredImage || undefined,
    author: user.userId,
    status: "draft" as const,
  });

  return apiResponse({ data: blog }, 201);
});
