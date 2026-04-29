import { NextRequest, NextResponse } from "next/server";
import { quoteService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "client");

  const rl = await checkRateLimit(`quote-accept:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  assertObjectId(id, "quoteId");
  const result = await quoteService.acceptQuote(user, id);
  return NextResponse.json({ ...result, message: "Quote accepted. Provider has been assigned." });
});
