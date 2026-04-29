import { NextRequest, NextResponse } from "next/server";
import { jobService } from "@/services";
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
  assertObjectId(id);

  const rl = await checkRateLimit(`job-get:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const job = await jobService.getJob(user, id);
  return NextResponse.json(job);
});
