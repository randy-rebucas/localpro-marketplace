import { NextRequest, NextResponse } from "next/server";
import { jobRepository } from "@/repositories/job.repository";
import { geoVerificationService } from "@/services/geo-verification.service";
import { requireUser, requireRole, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, ValidationError, NotFoundError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * POST /api/jobs/[id]/geo-check-in
 *
 * Provider check-in via GPS coordinates
 * - Validates GPS position against job location (100m geofence)
 * - Detects on-time vs late check-ins
 * - Records check-in attempt for analytics
 *
 * Body:
 * {
 *   latitude: number,
 *   longitude: number,
 *   accuracy: number (meters),
 *   platform: "ios" | "android" | "web",
 *   appVersion?: string
 * }
 */
export const POST = withHandler(async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "provider");
  requireCsrfToken(req, user);

  const { id: jobId } = await context.params;
  assertObjectId(jobId, "jobId");

  const rl = await checkRateLimit(`geo-check-in:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const { latitude, longitude, accuracy, platform, appVersion } = body;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new ValidationError("Invalid GPS coordinates");
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new ValidationError("GPS coordinates out of valid range");
  }

  if (accuracy === undefined || accuracy < 0) {
    throw new ValidationError("Invalid accuracy value");
  }

  if (!["ios", "android", "web"].includes(platform)) {
    throw new ValidationError("Invalid platform");
  }

  const job = await jobRepository.getDocById(jobId);
  if (!job) throw new NotFoundError("Job");

  if (job.providerId?.toString() !== user.userId) throw new ForbiddenError();

  if (!["assigned", "in_progress"].includes(job.status)) {
    return NextResponse.json(
      { error: "Job is not in a state that allows check-in", status: job.status },
      { status: 400 }
    );
  }

  const result = await geoVerificationService.verifyCheckIn({
    jobId,
    providerId: user.userId,
    latitude,
    longitude,
    accuracy,
    platform,
    appVersion,
  });

  // If valid check-in and job not yet started, transition to in_progress
  if (result.isValid && job.status === "assigned") {
    try {
      const { escrowService } = await import("@/services/escrow.service");
      await escrowService.startJob(user, jobId, []);
    } catch (err) {
      console.error("[geo-check-in] Error transitioning job to in_progress:", err);
    }
  }

  return NextResponse.json({
    success: result.isValid,
    checkIn: {
      distance: result.distance,
      isWithinGeofence: result.isWithinGeofence,
      status: result.status,
    },
    message: result.message,
  });
});
