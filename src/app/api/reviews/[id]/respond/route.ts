import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reviewService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const RespondSchema = z.object({
  response: z.string().min(1).max(500),
});

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const { id } = await params;
  const body = await req.json();
  const parsed = RespondSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const review = await reviewService.respondToReview(user, id, parsed.data.response);
  return NextResponse.json(review);
});
