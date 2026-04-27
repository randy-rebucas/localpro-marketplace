import { NextRequest, NextResponse } from "next/server";
import { blogCommentRepository } from "@/repositories/blog-comment.repository";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

import { checkRateLimit } from "@/lib/rateLimit";
/**
 * GET /api/admin/comments
 * Get pending comments for moderation (admin)
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCapability(user, "manage_blogs");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const searchParams = req.nextUrl.searchParams;
  const page  = Math.max(1, parseInt(searchParams.get("page")  || "1",  10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  const result = await blogCommentRepository.getPendingComments(page, limit);
  return NextResponse.json(result);
});
