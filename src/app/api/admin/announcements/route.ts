import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler } from "@/lib/utils";
import { requireUser, requireRole } from "@/lib/auth";
import { announcementRepository } from "@/repositories/announcement.repository";
import { ValidationError } from "@/lib/errors";

const TARGETS = ["all", "client", "provider", "admin", "staff"] as const;
const TYPES   = ["info", "warning", "success", "danger"] as const;

const CreateSchema = z.object({
  title:       z.string().min(2).max(120),
  message:     z.string().min(2).max(1000),
  type:        z.enum(TYPES).default("info"),
  targetRoles: z.array(z.enum(TARGETS)).min(1).default(["all"]),
  isActive:    z.boolean().default(true),
  expiresAt:   z.string().datetime().optional().nullable(),
});

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin", "staff");

  const docs = await announcementRepository.findAll();
  const announcements = docs.map((a) => ({
    _id:         String(a._id),
    title:       a.title,
    message:     a.message,
    type:        a.type,
    targetRoles: a.targetRoles,
    isActive:    a.isActive,
    expiresAt:   a.expiresAt instanceof Date ? a.expiresAt.toISOString() : (a.expiresAt ?? null),
    createdAt:   a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  }));

  return NextResponse.json({ announcements });
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { expiresAt, ...rest } = parsed.data;
  const doc = await announcementRepository.create({
    ...rest,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    createdBy: user.userId,
  });

  return NextResponse.json(
    {
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
    },
    { status: 201 }
  );
});
