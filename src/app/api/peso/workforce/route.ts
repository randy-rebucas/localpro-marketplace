import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";
import { pesoService } from "@/services/peso.service";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`peso-workforce:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const barangay        = searchParams.get("barangay")        ?? undefined;
  const skill           = searchParams.get("skill")           ?? undefined;
  const verificationTag = searchParams.get("verificationTag") ?? undefined;
  const rawMinRating    = searchParams.get("minRating");
  const minRating       = rawMinRating !== null
    ? (isNaN(Number(rawMinRating)) ? undefined : Math.max(0, Math.min(5, Number(rawMinRating))))
    : undefined;

  const result = await pesoService.getWorkforceRegistry({
    page,
    limit,
    barangay,
    skill,
    verificationTag,
    minRating,
  });

  return NextResponse.json(result);
});
