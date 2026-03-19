import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { quoteService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const MilestoneSchema = z.object({
  description: z.string().min(1),
  amount: z.number().min(0),
});

const ReviseQuoteSchema = z.object({
  proposedAmount: z.number().positive().optional(),
  laborCost: z.number().min(0).optional().nullable(),
  materialsCost: z.number().min(0).optional().nullable(),
  timeline: z.string().min(1).optional(),
  milestones: z.array(MilestoneSchema).optional(),
  message: z.string().min(20).max(1000).optional(),
});

export const PUT = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const { id } = await params;
  const body = await req.json();
  const parsed = ReviseQuoteSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const quote = await quoteService.reviseQuote(user, id, parsed.data);
  return NextResponse.json(quote);
});
