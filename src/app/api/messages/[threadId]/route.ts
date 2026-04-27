import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { messagingService } from "@/services";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

const SendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const GET = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`messages-get:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { threadId } = await params;
  assertObjectId(threadId, "threadId");

  const messages = await messagingService.getThread(user, threadId);
  return NextResponse.json(messages);
});

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) => {
  const user = await requireUser();
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`messages-send:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { threadId } = await params;
  assertObjectId(threadId, "threadId");

  const body = await req.json();
  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const message = await messagingService.sendMessage(user, {
    threadId,
    body: parsed.data.body,
  });
  return NextResponse.json(message, { status: 201 });
});
