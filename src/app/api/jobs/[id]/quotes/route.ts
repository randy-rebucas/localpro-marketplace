import { NextRequest, NextResponse } from "next/server";
import { quoteService } from "@/services";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const { id } = await params;
  assertObjectId(id, "jobId");

  const rl = await checkRateLimit(`job-quotes:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const quotes = await quoteService.getQuotesForJob(user, id);
  return NextResponse.json(quotes);
});
