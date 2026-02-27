import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supportService } from "@/services/support.service";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const ReplySchema = z.object({
  body: z.string().min(1).max(2000),
});

/** GET /api/admin/support/[userId] — admin views a user's support thread */
export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const { userId } = await params;
  const result = await supportService.getThreadForAdmin(userId);
  return NextResponse.json(result);
});

/** POST /api/admin/support/[userId] — admin replies to a user's support thread */
export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) => {
  const admin = await requireUser();
  requireRole(admin, "admin");
  const { userId } = await params;

  const body = await req.json();
  const parsed = ReplySchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const message = await supportService.adminReply(admin, userId, parsed.data.body);
  return NextResponse.json(message, { status: 201 });
});
