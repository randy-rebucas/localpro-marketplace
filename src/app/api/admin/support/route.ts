import { NextResponse } from "next/server";
import { supportService } from "@/services/support.service";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

/** GET /api/admin/support — admin gets all support thread summaries */
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin");
  const threads = await supportService.listThreads();
  return NextResponse.json(threads);
});
