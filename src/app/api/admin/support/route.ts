import { NextResponse } from "next/server";
import { supportService } from "@/services/support.service";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

/** GET /api/admin/support — admin gets all support thread summaries */
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireCapability(user, "manage_support");
  const threads = await supportService.listThreads();
  return NextResponse.json(threads);
});
