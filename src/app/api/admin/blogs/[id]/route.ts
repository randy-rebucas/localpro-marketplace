import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler, apiError, apiResponse } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { blogRepository } from "@/repositories";
import { assertObjectId, NotFoundError } from "@/lib/errors";

/**
 * Validation Schemas
 */
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

const PublishBlogSchema = z.object({
  scheduledFor: z.string().datetime().optional().nullable(),
});

type Ctx = { params: Promise<Record<string, string>> };

/**
 * PATCH /api/admin/blogs/[id]
 * Update blog details
 */
export const PATCH = withHandler(async (req: NextRequest, ctx: any) => {
  const user = await requireUser();
  requireCapability(user, "manage_blogs");

  const params = await ctx.params;
  const id = params.id;
  assertObjectId(id);

  // Verify blog exists
  const blog = await blogRepository.findById(id);
  if (!blog) {
    throw new NotFoundError("Blog not found");
  }

  const body = await req.json();
  const { status, scheduledFor, ...updateData } = UpdateBlogSchema.parse(body);

  // Sanitize: convert empty strings to undefined
  if (updateData.featuredImage === "") {
    (updateData as any).featuredImage = undefined;
  }

  // Handle status transitions
  if (status) {
    if (status === "published") {
      const updated = await blogRepository.publish(id);
      return apiResponse({ data: updated });
    } else if (status === "scheduled" && scheduledFor) {
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        throw new Error("Scheduled date must be in the future");
      }
      const updated = await blogRepository.schedule(id, scheduledDate);
      return apiResponse({ data: updated });
    } else if (status === "archived") {
      const updated = await blogRepository.archive(id);
      return apiResponse({ data: updated });
    } else {
      // Draft or other status change
      (updateData as any).status = status;
    }
  }

  // Update other fields
  const updated = await blogRepository.updateById(id, updateData as any);
  return apiResponse({ data: updated });
});

/**
 * DELETE /api/admin/blogs/[id]
 * Soft delete blog
 */
export const DELETE = withHandler(async (req: NextRequest, ctx: any) => {
  const user = await requireUser();
  requireCapability(user, "manage_blogs");

  const params = await ctx.params;
  const id = params.id;
  assertObjectId(id);

  // Verify blog exists
  const blog = await blogRepository.findById(id);
  if (!blog) {
    throw new NotFoundError("Blog not found");
  }

  await blogRepository.delete(id);

  return apiResponse({
    message: "Blog deleted successfully",
  });
});

/**
 * GET /api/admin/blogs/[id]
 * Get blog details
 */
export const GET = withHandler(async (req: NextRequest, ctx: any) => {
  const user = await requireUser();
  requireCapability(user, "manage_blogs");

  const params = await ctx.params;
  const id = params.id;
  assertObjectId(id);

  const blog = await blogRepository.findById(id);
  if (!blog) {
    throw new NotFoundError("Blog not found");
  }

  return apiResponse({ data: blog });
});
