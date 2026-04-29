import { NextRequest, NextResponse } from "next/server";
import { blogCommentRepository } from "@/repositories/blog-comment.repository";
import { blogRepository } from "@/repositories";
import { sendCommentPendingApprovalEmail } from "@/lib/blog-notifications";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const createCommentSchema = z.object({
  authorName:      z.string().min(1).max(100),
  authorEmail:     z.string().email().max(254),
  content:         z.string().min(1).max(5000),
  parentCommentId: z.string().optional(),
});

/**
 * GET /api/blog/[blogId]/comments
 * Get approved comments for a blog (public)
 */
export const GET = withHandler(
  async (req: NextRequest, { params }: { params: Promise<{ blogId: string }> }) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = await checkRateLimit(`blog-comments-get:${ip}`, { windowMs: 60_000, max: 60 });
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const { blogId } = await params;
    assertObjectId(blogId, "blogId");

    const searchParams = req.nextUrl.searchParams;
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));

    const result = await blogCommentRepository.getApprovedComments(blogId, page, limit);
    return NextResponse.json(result);
  }
);

/**
 * POST /api/blog/[blogId]/comments
 * Create new comment (public)
 */
export const POST = withHandler(
  async (req: NextRequest, { params }: { params: Promise<{ blogId: string }> }) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = await checkRateLimit(`blog-comments-post:${ip}`, { windowMs: 60_000, max: 5 });
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const { blogId } = await params;
    assertObjectId(blogId, "blogId");

    const body = await req.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

    const blog = await blogRepository.findById(blogId);
    if (!blog) throw new NotFoundError("Blog");

    const comment = await blogCommentRepository.create({
      blog:          blogId,
      authorName:    parsed.data.authorName,
      authorEmail:   parsed.data.authorEmail,
      content:       parsed.data.content,
      parentComment: parsed.data.parentCommentId,
    });

    // Fire-and-forget author notification
    (async () => {
      try {
        const populatedAuthor = blog.author as import("@/models/Blog").PopulatedAuthor;
        const authorEmail = typeof blog.author === "object" && "email" in blog.author
          ? populatedAuthor.email
          : undefined;
        if (authorEmail) {
          await sendCommentPendingApprovalEmail(blog, comment, authorEmail);
        }
      } catch (err) {
        console.error("Error sending comment notification:", err);
      }
    })();

    return NextResponse.json(
      { message: "Comment submitted for moderation", comment },
      { status: 201 }
    );
  }
);
