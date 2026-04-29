import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDB } from "@/lib/db";
import QuoteTemplate from "@/models/QuoteTemplate";

const MAX_AMOUNT = 10_000_000;

const MilestoneSchema = z.object({
  description: z.string().min(1).max(500),
  amount:      z.number().min(0).max(MAX_AMOUNT),
});

const CreateTemplateSchema = z.object({
  name:          z.string().min(1).max(100),
  laborCost:     z.number().min(0).max(MAX_AMOUNT).optional().nullable(),
  materialsCost: z.number().min(0).max(MAX_AMOUNT).optional().nullable(),
  timeline:      z.string().max(200).optional().default(""),
  milestones:    z.array(MilestoneSchema).max(20).optional().default([]),
  notes:         z.string().max(2000).optional().nullable(),
});

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const rl = await checkRateLimit(`qt-get:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const templates = await QuoteTemplate.find({ providerId: user.userId })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(templates);
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const rl = await checkRateLimit(`qt-post:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateTemplateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  // Limit to 20 templates per provider
  const count = await QuoteTemplate.countDocuments({ providerId: user.userId });
  if (count >= 20) throw new ValidationError("Maximum 20 templates allowed");

  const template = await QuoteTemplate.create({
    ...parsed.data,
    providerId: user.userId,
  });

  return NextResponse.json(template, { status: 201 });
});
