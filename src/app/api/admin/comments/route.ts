import { NextRequest, NextResponse } from "next/server";
import { blogCommentRepository } from "@/repositories/blog-comment.repository";

/**
 * GET /api/admin/comments
 * Get pending comments for moderation (admin)
 */
export async function GET(req: NextRequest) {
  try {
    // TODO: Add authentication check for admin
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const result = await blogCommentRepository.getPendingComments(page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching pending comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
