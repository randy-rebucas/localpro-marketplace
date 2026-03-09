import { NextResponse } from "next/server";
import { ledgerService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async (req) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { searchParams } = new URL(req.url);
  const currency = searchParams.get("currency") ?? "PHP";

  const data = await ledgerService.getTrialBalance(currency);
  return NextResponse.json(data);
});
