import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { payoutService } from "@/services/payout.service";

/** GET /api/admin/payouts — list all payout requests */
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin");

  const payouts = await payoutService.listAllPayouts();
  return NextResponse.json(payouts);
});
