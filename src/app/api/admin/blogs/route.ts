import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler, apiError, apiResponse } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { blogRepository } from "@/repositories";
import { assertObjectId } from "@/lib/errors";

/**
 * Validation Schemas
 */
const CreateBlogSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10),
  excerpt: z.string().max(500).optional(),
  featuredImage: z.string().url().optional().nullable().or(z.literal("")),
  category: z.enum(["news", "tutorial", "tips-tricks", "service-update", "provider-story", "client-story", "industry-insights", "announcement", "other"]).default("other"),
  metaDescription: z.string().max(160).optional(),
  keywords: z.array(z.string()).default([]),
});

const UpdateBlogSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  content: z.string().min(10).optional(),
  excerpt: z.string().max(500).optional(),
  featuredImage: z.string().url().optional().nullable().or(z.literal("")),
  category: z.enum(["news", "tutorial", "tips-tricks", "service-update", "provider-story", "client-story", "industry-insights", "announcement", "other"]).optional(),
  metaDescription: z.string().max(160).optional(),
  keywords: z.array(z.string()).optional(),
  status: z.enum(["draft", "published", "scheduled", "archived"]).optional(),
  scheduledFor: z.string().datetime().optional().nullable(),
});

type Ctx = { params: Promise<Record<string, string>> };

/**
 * GET /api/admin/blogs
 * List all blogs with pagination and filters
 */
export const GET = withHandler(async (req: NextRequest, _ctx: any) => {
  const user = await requireUser();
  requireCapability(user, "manage_blogs");

  // Parse query parameters
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const status = searchParams.get("status") as any;
  const search = searchParams.get("search");

  const result = await blogRepository.findAll({
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
    status,
    search: search ?? undefined,
    author: user.userId,
  });

  return apiResponse({
    data: result,
  });
});

/**
 * POST /api/admin/blogs
 * Create new blog (initial status: draft)
 */
export const POST = withHandler(async (req: NextRequest, _ctx: any) => {
  const user = await requireUser();
  requireCapability(user, "manage_blogs");

  const body = await req.json();
  const validated = CreateBlogSchema.parse(body);

  // Sanitize: convert empty strings to undefined
  const sanitized = {
    ...(validated as any),
    featuredImage: validated.featuredImage || undefined,
    author: user.userId,
    status: "draft",
  };

  const blog = await blogRepository.create(sanitized);

  return apiResponse(
    {
      data: blog,
    },
    201
  );
});
