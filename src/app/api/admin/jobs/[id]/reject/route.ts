import { NextRequest, NextResponse } from "next/server";
import { adminService } from "@/services";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";

import { checkRateLimit } from "@/lib/rateLimit";
export const PATCH = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCapability(user, "manage_jobs");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  assertObjectId(id, "jobId");
  const job = await adminService.rejectJob(user.userId, id);
  return NextResponse.json({ job, message: "Job rejected" });
});
