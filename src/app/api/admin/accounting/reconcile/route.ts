import { NextResponse } from "next/server";
import { ledgerService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

import { checkRateLimit } from "@/lib/rateLimit";
/** POST /api/admin/accounting/reconcile — refresh cached account balances */
export const POST = withHandler(async (req) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const currency = searchParams.get("currency") ?? "PHP";

  await ledgerService.refreshBalances(currency);
  return NextResponse.json({ success: true, message: "Account balances refreshed." });
});

/** GET /api/admin/accounting/reconcile — check earnings payable reconciliation */
export const GET = withHandler(async (req) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const currency = searchParams.get("currency") ?? "PHP";

  const data = await ledgerService.reconcileEarningsPayable(currency);
  return NextResponse.json(data);
});
