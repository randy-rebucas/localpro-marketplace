import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { connectDB } from "@/lib/db";
import QuoteTemplate from "@/models/QuoteTemplate";

const MilestoneSchema = z.object({
  description: z.string().min(1),
  amount: z.number().min(0),
});

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  laborCost: z.number().min(0).optional().nullable(),
  materialsCost: z.number().min(0).optional().nullable(),
  timeline: z.string().max(200).optional().default(""),
  milestones: z.array(MilestoneSchema).optional().default([]),
  notes: z.string().max(2000).optional().nullable(),
});

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "provider");
  await connectDB();

  const templates = await QuoteTemplate.find({ providerId: user.userId })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(templates);
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const body = await req.json();
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
