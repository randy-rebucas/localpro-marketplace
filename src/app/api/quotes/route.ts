import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { quoteService } from "@/services";
import { quoteRepository } from "@/repositories";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const CreateQuoteSchema = z.object({
  jobId: z.string().min(1),
  proposedAmount: z.number().positive(),
  timeline: z.string().min(1),
  message: z.string().min(20).max(1000),
});

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "provider");
  const quotes = await quoteRepository.findByProvider(user.userId);
  const quotedJobIds = quotes.map((q) => (q as unknown as { jobId: { toString(): string } }).jobId.toString());
  return NextResponse.json({ quotedJobIds });
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const body = await req.json();
  const parsed = CreateQuoteSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const quote = await quoteService.submitQuote(user, parsed.data);
  return NextResponse.json(quote, { status: 201 });
});
