import { NextRequest, NextResponse } from "next/server";
import { blogCommentRepository } from "@/repositories/blog-comment.repository";
import { blogRepository } from "@/repositories";
import { sendCommentApprovedEmail, sendCommentRejectedEmail } from "@/lib/blog-notifications";
import { requireUser, requireCapability, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const updateCommentSchema = z.object({
  action: z.enum(["approve", "reject", "spam"]),
});

/** PATCH /api/admin/comments/[commentId] */
export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) => {
  const user = await requireUser();
  requireCapability(user, "manage_blogs");
  await requireCsrfToken(req, user);
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { commentId } = await params;
  assertObjectId(commentId, "commentId");

  const body = await req.json();
  const validated = updateCommentSchema.safeParse(body);
  if (!validated.success) throw new ValidationError(validated.error.errors[0].message);

  let comment;
  switch (validated.data.action) {
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

  if (!comment) throw new NotFoundError("Comment");

  (async () => {
    try {
      const blog = await blogRepository.findById(comment.blog?.toString() || "");
      if (!blog || !comment.authorEmail) return;
      if (validated.data.action === "approve") {
        await sendCommentApprovedEmail(blog, comment, comment.authorEmail);
      } else if (validated.data.action === "reject") {
        await sendCommentRejectedEmail(blog, comment, comment.authorEmail);
      }
    } catch {
      // non-fatal email
    }
  })();

  return NextResponse.json({ message: `Comment ${validated.data.action}ed`, comment });
});

/** DELETE /api/admin/comments/[commentId] */
export const DELETE = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) => {
  const user = await requireUser();
  requireCapability(user, "manage_blogs");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { commentId } = await params;
  assertObjectId(commentId, "commentId");

  const comment = await blogCommentRepository.delete(commentId);
  if (!comment) throw new NotFoundError("Comment");

  return NextResponse.json({ message: "Comment deleted" });
});
