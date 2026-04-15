import { NextRequest, NextResponse } from "next/server";
import { blogCommentRepository } from "@/repositories/blog-comment.repository";
import { z } from "zod";

/**
 * GET /api/blog/[blogId]/comments
 * Get approved comments for a blog (public)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const { blogId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const result = await blogCommentRepository.getApprovedComments(
      blogId,
      page,
      limit
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blog/[blogId]/comments
 * Create new comment (public)
 */
const createCommentSchema = z.object({
  authorName: z.string().min(1).max(100),
  authorEmail: z.string().email(),
  content: z.string().min(1).max(5000),
  parentCommentId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const { blogId } = await params;
    const body = await req.json();

    // Validate payload
    const validated = createCommentSchema.parse(body);

    // Create comment
    const comment = await blogCommentRepository.create({
      blog: blogId,
      authorName: validated.authorName,
      authorEmail: validated.authorEmail,
      content: validated.content,
      parentComment: validated.parentCommentId,
    });

    return NextResponse.json(
      {
        message: "Comment submitted for moderation",
        comment,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
