import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supportService } from "@/services/support.service";
import { businessService } from "@/services/business.service";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

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

  const rl = await checkRateLimit(`support-msg:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  // Enforce Priority Support plan gate for business clients
  await businessService.checkPrioritySupportAccess(user.userId);

  const body = await req.json().catch(() => ({}));
  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const message = await supportService.sendUserMessage(user, parsed.data.body);
  return NextResponse.json(message, { status: 201 });
});
