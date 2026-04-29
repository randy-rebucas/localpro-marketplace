import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConsultationService } from "@/services/consultation.service";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import type { ConsultationStatus } from "@/types";

const CLOUDINARY_URL_RE = /^https:\/\/res\.cloudinary\.com\//;

const CreateConsultationSchema = z.object({
  targetUserId: z.string().min(1, "Target user ID is required"),
  type: z.enum(["site_inspection", "chat"]),
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(1000),
  location: z.string().min(1),
  coordinates: z
    .object({
      type: z.literal("Point"),
      coordinates: z.tuple([z.number(), z.number()]),
    })
    .optional(),
  photos: z
    .array(z.string().url().refine((u) => CLOUDINARY_URL_RE.test(u), "Invalid photo URL"))
    .min(1)
    .max(5),
});

const CONSULTATION_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "converted",
  "expired",
] as const;

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`consultations-get:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);

  const rawStatus = searchParams.get("status");
  const statusValues = rawStatus
    ? (rawStatus.split(",").filter((s) =>
        (CONSULTATION_STATUSES as readonly string[]).includes(s)
      ) as ConsultationStatus[])
    : undefined;
  const status = statusValues && statusValues.length > 0 ? statusValues : undefined;

  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));

  const consultationService = new ConsultationService();
  const result = await consultationService.listConsultations(user, { status, page, limit });

  return NextResponse.json(result);
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`consultations-post:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = CreateConsultationSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0].message);
  }

  assertObjectId(parsed.data.targetUserId, "targetUserId");

  const consultationService = new ConsultationService();
  const consultation = await consultationService.createConsultation(user, parsed.data);

  return NextResponse.json(consultation, { status: 201 });
});
