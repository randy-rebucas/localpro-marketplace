import { NextRequest, NextResponse } from "next/server";
import { jobService } from "@/services";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const { id } = await params;
  const job = await jobService.getJob(user, id);
  return NextResponse.json(job);
});
