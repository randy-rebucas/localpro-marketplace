import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, ForbiddenError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDB } from "@/lib/db";
import QuoteTemplate from "@/models/QuoteTemplate";

const MAX_AMOUNT = 10_000_000;

const MilestoneSchema = z.object({
  description: z.string().min(1).max(500),
  amount:      z.number().min(0).max(MAX_AMOUNT),
});

const UpdateTemplateSchema = z.object({
  name:          z.string().min(1).max(100).optional(),
  laborCost:     z.number().min(0).max(MAX_AMOUNT).optional().nullable(),
  materialsCost: z.number().min(0).max(MAX_AMOUNT).optional().nullable(),
  timeline:      z.string().max(200).optional(),
  milestones:    z.array(MilestoneSchema).max(20).optional(),
  notes:         z.string().max(2000).optional().nullable(),
});

export const PATCH = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const { id } = await params;
  assertObjectId(id, "templateId");

  const rl = await checkRateLimit(`qt-patch:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateTemplateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  const template = await QuoteTemplate.findById(id);
  if (!template) throw new NotFoundError("Template");
  if (template.providerId.toString() !== user.userId) throw new ForbiddenError();

  Object.assign(template, parsed.data);
  await template.save();

  return NextResponse.json(template);
});

export const DELETE = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const { id } = await params;
  assertObjectId(id, "templateId");

  const rl = await checkRateLimit(`qt-delete:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const template = await QuoteTemplate.findById(id);
  if (!template) throw new NotFoundError("Template");
  if (template.providerId.toString() !== user.userId) throw new ForbiddenError();

  await template.deleteOne();

  return NextResponse.json({ success: true });
});
