import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { quoteService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_AMOUNT = 10_000_000;

const MilestoneSchema = z.object({
  description: z.string().min(1).max(500),
  amount:      z.number().min(0).max(MAX_AMOUNT),
});

const ReviseQuoteSchema = z.object({
  proposedAmount: z.number().positive().max(MAX_AMOUNT).optional(),
  laborCost:      z.number().min(0).max(MAX_AMOUNT).optional().nullable(),
  materialsCost:  z.number().min(0).max(MAX_AMOUNT).optional().nullable(),
  timeline:       z.string().min(1).max(200).optional(),
  milestones:     z.array(MilestoneSchema).max(20).optional(),
  message:        z.string().min(20).max(1000).optional(),
});

export const PUT = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const { id } = await params;
  assertObjectId(id, "quoteId");

  const rl = await checkRateLimit(`quotes-put:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = ReviseQuoteSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const quote = await quoteService.reviseQuote(user, id, parsed.data);
  return NextResponse.json(quote);
});
