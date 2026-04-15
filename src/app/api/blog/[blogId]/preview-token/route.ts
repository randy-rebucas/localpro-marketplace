import { getCurrentUser } from "@/lib/auth";
import { blogRepository } from "@/repositories";
import { generatePreviewToken } from "@/lib/preview-token";
import { Types } from "mongoose";
import { NextResponse } from "next/server";

/**
 * POST /api/blog/[blogId]/preview-token
 * 
 * Generate a preview token for a draft/scheduled blog
 * Only the blog author or admin can generate preview tokens
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const { blogId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch blog
    const blog = await blogRepository.findById(blogId);
    if (!blog) {
      return NextResponse.json(
        { error: "Blog not found" },
        { status: 404 }
      );
    }

    // Check authorization: only author or admin can preview
    const authorId =
      typeof blog.author === "object" ? blog.author._id : blog.author;
    const isAuthor = authorId.toString() === user.userId;
    const isAdmin = user.role === "admin" || (user.role === "staff" && user.capabilities?.includes("manage_blogs"));

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: You can only preview your own blogs" },
        { status: 403 }
      );
    }

    // Check blog status (can only preview draft/scheduled)
    if (blog.status === "published") {
      return NextResponse.json(
        { error: "Blog is already published. No preview token needed." },
        { status: 400 }
      );
    }

    if (blog.status === "archived") {
      return NextResponse.json(
        { error: "Cannot preview archived blogs" },
        { status: 400 }
      );
    }

    // Generate preview token
    const token = generatePreviewToken(blogId, user.userId);

    return NextResponse.json({
      success: true,
      token,
      previewUrl: `/blog/${blog.slug}/preview?token=${encodeURIComponent(token)}`,
      expiresIn: "7 days",
    });
  } catch (error) {
    console.error("[Preview Token API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
