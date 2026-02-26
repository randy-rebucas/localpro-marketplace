import { NextRequest, NextResponse } from "next/server";
import { jobService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { searchParams } = new URL(req.url);
  const result = await jobService.listJobs(user, {
    status: searchParams.get("status") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    page: parseInt(searchParams.get("page") ?? "1"),
    limit: parseInt(searchParams.get("limit") ?? "20"),
  });

  return NextResponse.json(result);
});
