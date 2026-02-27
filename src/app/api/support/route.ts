import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supportService } from "@/services/support.service";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const SendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

/** GET /api/support — user fetches their own support thread */
export const GET = withHandler(async () => {
  const user = await requireUser();
  const messages = await supportService.getThread(user);
  return NextResponse.json(messages);
});

/** POST /api/support — user sends a message to support */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const body = await req.json();
  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const message = await supportService.sendUserMessage(user, parsed.data.body);
  return NextResponse.json(message, { status: 201 });
});
