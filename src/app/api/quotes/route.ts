import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { quoteService } from "@/services";
import { quoteRepository } from "@/repositories";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_AMOUNT = 10_000_000; // 10M PHP ceiling

const MilestoneSchema = z.object({
  description: z.string().min(1).max(500),
  amount:      z.number().min(0).max(MAX_AMOUNT),
});

const CreateQuoteSchema = z.object({
  jobId:          z.string().regex(/^[a-f\d]{24}$/i, "Invalid jobId"),
  proposedAmount: z.number().positive().max(MAX_AMOUNT),
  laborCost:      z.number().min(0).max(MAX_AMOUNT).optional().nullable(),
  materialsCost:  z.number().min(0).max(MAX_AMOUNT).optional().nullable(),
  timeline:       z.string().min(1).max(200),
  milestones:     z.array(MilestoneSchema).max(20).optional().default([]),
  notes:          z.string().max(2000).optional().nullable(),
  proposalDocUrl: z.string().url().max(2048).optional().nullable(),
  sitePhotos:     z.array(z.string().url().max(2048)).max(10).optional().default([]),
  message:        z.string().min(20).max(1000),
});

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const rl = await checkRateLimit(`quotes-get:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const quotes = await quoteRepository.findByProvider(user.userId);
  const quotedJobIds = quotes.map((q) => (q as unknown as { jobId: { toString(): string } }).jobId.toString());
  return NextResponse.json({ quotedJobIds });
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const rl = await checkRateLimit(`quotes-post:${user.userId}`, { windowMs: 3_600_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateQuoteSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const quote = await quoteService.submitQuote(user, parsed.data);
  return NextResponse.json(quote, { status: 201 });
});
