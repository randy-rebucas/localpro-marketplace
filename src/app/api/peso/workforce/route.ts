import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { pesoService } from "@/services/peso.service";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const barangay = searchParams.get("barangay") ?? undefined;
  const skill = searchParams.get("skill") ?? undefined;
  const verificationTag = searchParams.get("verificationTag") ?? undefined;
  const minRating = searchParams.get("minRating")
    ? Number(searchParams.get("minRating"))
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
