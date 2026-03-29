import { NextRequest, NextResponse } from "next/server";
import { ConsultationService } from "@/services/consultation.service";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";

export const GET = withHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    assertObjectId(id, "consultationId");
    const consultationService = new ConsultationService();

    const result = await consultationService.getConsultation(user, id);

    return NextResponse.json(result);
  }
);
