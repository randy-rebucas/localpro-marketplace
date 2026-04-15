import { NextRequest, NextResponse } from "next/server";
import { blogCommentRepository } from "@/repositories/blog-comment.repository";
import { z } from "zod";

/**
 * PATCH /api/admin/comments/[commentId]
 * Approve, reject, or spam flag a comment (admin)
 */
const updateCommentSchema = z.object({
  action: z.enum(["approve", "reject", "spam"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    // TODO: Add authentication check for admin
    const { commentId } = await params;
    const body = await req.json();

    const validated = updateCommentSchema.parse(body);

    let comment;
    switch (validated.action) {
      case "approve":
        comment = await blogCommentRepository.approve(commentId);
        break;
      case "reject":
        comment = await blogCommentRepository.reject(commentId);
        break;
      case "spam":
        comment = await blogCommentRepository.markAsSpam(commentId);
        break;
    }

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Comment ${validated.action}ed`,
      comment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/comments/[commentId]
 * Delete a comment (admin)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    // TODO: Add authentication check for admin
    const { commentId } = await params;

    const comment = await blogCommentRepository.delete(commentId);

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Comment deleted" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
