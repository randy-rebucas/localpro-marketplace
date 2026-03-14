import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import { cronService } from "@/services/cron.service";

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const [expireResult, revertResult] = await Promise.all([
    cronService.expireStaleJobs(),
    cronService.revertStaleAssignments(),
  ]);
  return Response.json({ ok: true, ...expireResult, ...revertResult });
}
