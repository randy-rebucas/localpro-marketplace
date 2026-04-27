import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConsultationService } from "@/services/consultation.service";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

const ConvertToJobSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).optional(),
  budget: z.number().positive("Budget must be at least ₱1"),
  scheduleDate: z.string().datetime().refine(
    (val) => new Date(val) > new Date(),
    { message: "Schedule date must be in the future" }
  ),
  specialInstructions: z.string().max(500).optional(),
});

export const POST = withHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    requireCsrfToken(req, user);

    const rl = await checkRateLimit(`consultation-convert:${user.userId}`, { windowMs: 60_000, max: 10 });
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const { id } = await params;
    assertObjectId(id, "consultationId");

    const body = await req.json();
    const parsed = ConvertToJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const consultationService = new ConsultationService();
    const result = await consultationService.convertToJob(user, id, parsed.data);

    return NextResponse.json(result, { status: 201 });
  }
);
