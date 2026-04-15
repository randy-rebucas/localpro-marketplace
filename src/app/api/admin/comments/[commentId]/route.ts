import { NextRequest, NextResponse } from "next/server";
import { blogCommentRepository } from "@/repositories/blog-comment.repository";
import { blogRepository } from "@/repositories";
import { sendCommentApprovedEmail, sendCommentRejectedEmail } from "@/lib/blog-notifications";
import { requireUser, requireCapability } from "@/lib/auth";
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
    const user = await requireUser();
    requireCapability(user, "manage_blogs");
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

    // Send notification email asynchronously
    (async () => {
      try {
        // Fetch blog details
        const blog = await blogRepository.findById(comment.blog?.toString() || "");
        if (!blog || !comment.authorEmail) {
          return; // Can't send notification
        }

        if (validated.action === "approve") {
          await sendCommentApprovedEmail(blog, comment, comment.authorEmail);
        } else if (validated.action === "reject") {
          await sendCommentRejectedEmail(blog, comment, comment.authorEmail);
        }
      } catch (error) {
        console.error("Error sending comment notification email:", error);
        // Don't fail the request if email fails
      }
    })();

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
    const user = await requireUser();
    requireCapability(user, "manage_blogs");
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
