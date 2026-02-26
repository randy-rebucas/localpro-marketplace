import { NextRequest, NextResponse } from "next/server";
import { quoteService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const PATCH = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "client");

  const { id } = await params;
  const quote = await quoteService.rejectQuote(user, id);
  return NextResponse.json({ quote, message: "Quote rejected" });
});
