import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler } from "@/lib/utils";
import { requireUser, requireRole } from "@/lib/auth";
import { announcementRepository } from "@/repositories/announcement.repository";
import { ValidationError, NotFoundError, assertObjectId } from "@/lib/errors";

import { checkRateLimit } from "@/lib/rateLimit";
const TARGETS = ["all", "client", "provider", "admin", "staff"] as const;
const TYPES   = ["info", "warning", "success", "danger"] as const;

const UpdateSchema = z.object({
  title:       z.string().min(2).max(120).optional(),
  message:     z.string().min(2).max(1000).optional(),
  type:        z.enum(TYPES).optional(),
  targetRoles: z.array(z.enum(TARGETS)).min(1).optional(),
  isActive:    z.boolean().optional(),
  expiresAt:   z.string().datetime().optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export const PUT = withHandler(async (req: NextRequest, ctx: RouteContext) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await ctx.params;
  assertObjectId(id, "announcementId");
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { expiresAt, ...rest } = parsed.data;
  const update: Record<string, unknown> = { ...rest };
  if (expiresAt !== undefined) update.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const doc = await announcementRepository.update(id, update as Parameters<typeof announcementRepository.update>[1]);
  if (!doc) throw new NotFoundError("Announcement not found");

  return NextResponse.json({
    announcement: {
      _id:         String(doc._id),
      title:       doc.title,
      message:     doc.message,
      type:        doc.type,
      targetRoles: doc.targetRoles,
      isActive:    doc.isActive,
      expiresAt:   doc.expiresAt instanceof Date ? doc.expiresAt.toISOString() : (doc.expiresAt ?? null),
      createdAt:   doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    },
  });
});

export const DELETE = withHandler(async (_req: NextRequest, ctx: RouteContext) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await ctx.params;
  assertObjectId(id, "announcementId");
  const doc = await announcementRepository.delete(id);
  if (!doc) throw new NotFoundError("Announcement not found");

  return NextResponse.json({ success: true });
});
