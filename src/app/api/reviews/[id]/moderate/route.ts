import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reviewService } from "@/services";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const ModerateSchema = z.object({
  hide: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const PUT = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  // Admin/staff capability check is done inside moderateReview()

  const { id } = await params;
  const body = await req.json();
  const parsed = ModerateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const review = await reviewService.moderateReview(user, id, parsed.data);
  return NextResponse.json(review);
});
