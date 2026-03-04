import type { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { connectDB } from "@/lib/db";
import ConsultationService from "@/services/consultation.service";

/**
 * Daily consultation maintenance cron:
 *  1. Expire pending/accepted consultations whose expiresAt has passed
 *  2. Flag accepted consultations not converted to a job after 7 days
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const consultationService = new ConsultationService();

  const [expired, stale] = await Promise.all([
    consultationService.expireOldConsultations(),
    consultationService.flagStaleAcceptedConsultations(),
  ]);

  return Response.json({
    ok: true,
    expiredConsultations: expired,
    staleAcceptedFlagged: stale,
  });
}
