import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { messagingService } from "@/services";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const SendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) => {
  const user = await requireUser();
  const { threadId } = await params;
  const messages = await messagingService.getThread(user, threadId);
  return NextResponse.json(messages);
});

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) => {
  const user = await requireUser();
  const { threadId } = await params;

  const body = await req.json();
  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const message = await messagingService.sendMessage(user, {
    threadId,
    body: parsed.data.body,
  });
  return NextResponse.json(message, { status: 201 });
});
