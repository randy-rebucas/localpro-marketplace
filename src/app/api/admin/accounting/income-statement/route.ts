import { NextResponse } from "next/server";
import { ledgerService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async (req) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { searchParams } = new URL(req.url);
  const currency = searchParams.get("currency") ?? "PHP";
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

  const data = await ledgerService.getIncomeStatement(from, to, currency);
  return NextResponse.json(data);
});
