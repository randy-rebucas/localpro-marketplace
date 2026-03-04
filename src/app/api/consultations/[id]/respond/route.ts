import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConsultationService } from "@/services/consultation.service";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const RespondToConsultationSchema = z.object({
  action: z.enum(["accept", "decline"]),
  estimateAmount: z.number().positive().optional(),
  estimateNote: z.string().min(20).optional(),
});

export const PUT = withHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;

    const body = await req.json();
    const parsed = RespondToConsultationSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const consultationService = new ConsultationService();
    const consultation = await consultationService.respondToConsultation(
      user,
      id,
      parsed.data
    );

    return NextResponse.json(consultation);
  }
);
