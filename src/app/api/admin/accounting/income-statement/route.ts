import { NextResponse } from "next/server";
import { ledgerService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async (req) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { searchParams } = new URL(req.url);
  const currency = searchParams.get("currency") ?? "PHP";

  // Parse date strings as full-UTC boundaries so no in-range entries are cut off.
  // "2026-03-01" → start of that day UTC; "2026-03-12" → end of that day UTC.
  const fromStr = searchParams.get("from");
  const toStr   = searchParams.get("to");

  const from = fromStr
    ? new Date(`${fromStr}T00:00:00.000Z`)
    : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

  const to = toStr
    ? new Date(`${toStr}T23:59:59.999Z`)
    : new Date();

  const data = await ledgerService.getIncomeStatement(from, to, currency);
  return NextResponse.json(data);
});
