import { NextRequest, NextResponse } from "next/server";
import { ConsultationService } from "@/services/consultation.service";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

export const GET = withHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();

    const rl = await checkRateLimit(`consultation-get:${user.userId}`, { windowMs: 60_000, max: 60 });
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const { id } = await params;
    assertObjectId(id, "consultationId");

    const consultationService = new ConsultationService();
    const result = await consultationService.getConsultation(user, id);

    return NextResponse.json(result);
  }
);
