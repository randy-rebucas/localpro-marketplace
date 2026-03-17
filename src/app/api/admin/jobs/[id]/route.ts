import { NextRequest, NextResponse } from "next/server";
import { jobRepository } from "@/repositories/job.repository";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await requireUser();
  requireCapability(user, "manage_jobs");

  const { id } = await params;
  const job = await jobRepository.findByIdPopulated(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ job });
});
