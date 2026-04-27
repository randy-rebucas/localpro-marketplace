import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { blogRepository } from "@/repositories";
import { generatePreviewToken } from "@/lib/preview-token";
import { withHandler } from "@/lib/utils";
import { NotFoundError, ForbiddenError, ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * POST /api/blog/[blogId]/preview-token
 *
 * Generate a preview token for a draft/scheduled blog.
 * Only the blog author or admin/staff with manage_blogs can generate tokens.
 */
export const POST = withHandler(
  async (req: NextRequest, { params }: { params: Promise<{ blogId: string }> }) => {
    const user = await requireUser();
    requireCsrfToken(req, user);

    const rl = await checkRateLimit(`blog-preview-token:${user.userId}`, { windowMs: 60_000, max: 10 });
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const { blogId } = await params;
    assertObjectId(blogId, "blogId");

    const blog = await blogRepository.findById(blogId);
    if (!blog) throw new NotFoundError("Blog");

    const authorId = typeof blog.author === "object" ? blog.author._id : blog.author;
    const isAuthor = authorId.toString() === user.userId;
    const isAdmin  = user.role === "admin" || (user.role === "staff" && user.capabilities?.includes("manage_blogs"));

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenError("You can only preview your own blogs.");
    }

    if (blog.status === "published") {
      throw new ValidationError("Blog is already published. No preview token needed.");
    }

    if (blog.status === "archived") {
      throw new ValidationError("Cannot preview archived blogs.");
    }

    const token = generatePreviewToken(blogId, user.userId);

    return NextResponse.json({
      success: true,
      token,
      previewUrl: `/blog/${blog.slug}/preview?token=${encodeURIComponent(token)}`,
      expiresIn: "7 days",
    });
  }
);
