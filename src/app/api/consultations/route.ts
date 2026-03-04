import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConsultationService } from "@/services/consultation.service";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, ForbiddenError } from "@/lib/errors";
import type { ConsultationStatus } from "@/types";

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
  photos: z.array(z.string().url()).min(1).max(5),
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
  const { searchParams } = new URL(req.url);

  const rawStatus = searchParams.get("status");
  const statusValues = rawStatus
    ? (rawStatus.split(",").filter((s) =>
        (CONSULTATION_STATUSES as readonly string[]).includes(s)
      ) as ConsultationStatus[])
    : undefined;
  const status =
    statusValues && statusValues.length > 0 ? statusValues : undefined;

  const consultationService = new ConsultationService();
  const result = await consultationService.listConsultations(user, {
    status,
    page: Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1),
    limit: Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20),
  });

  return NextResponse.json(result);
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const body = await req.json();
  const parsed = CreateConsultationSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0].message);
  }

  const consultationService = new ConsultationService();
  const consultation = await consultationService.createConsultation(
    user,
    parsed.data
  );

  return NextResponse.json(consultation, { status: 201 });
});
