import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { connectDB } from "@/lib/db";
import QuoteTemplate from "@/models/QuoteTemplate";

const MilestoneSchema = z.object({
  description: z.string().min(1),
  amount: z.number().min(0),
});

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  laborCost: z.number().min(0).optional().nullable(),
  materialsCost: z.number().min(0).optional().nullable(),
  timeline: z.string().max(200).optional(),
  milestones: z.array(MilestoneSchema).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const PATCH = withHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const { id } = await params;
  const body = await req.json();
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

export const DELETE = withHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const { id } = await params;
  await connectDB();

  const template = await QuoteTemplate.findById(id);
  if (!template) throw new NotFoundError("Template");
  if (template.providerId.toString() !== user.userId) throw new ForbiddenError();

  await template.deleteOne();

  return NextResponse.json({ success: true });
});
