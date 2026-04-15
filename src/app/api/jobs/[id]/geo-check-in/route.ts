import { NextRequest, NextResponse } from "next/server";
import { jobRepository } from "@/repositories/job.repository";
import { geoVerificationService } from "@/services/geo-verification.service";
import { providerReplacementService } from "@/services/provider-replacement.service";
import { requireUser } from "@/lib/auth";
import { isValidObjectId } from "mongoose";
import { ForbiddenError, ValidationError, NotFoundError } from "@/lib/errors";

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
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = await requireUser();
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: jobId } = await context.params;

    // Validate jobId format
    if (!isValidObjectId(jobId)) {
      throw new ValidationError("Invalid job ID format");
    }

    const body = await req.json();
    const { latitude, longitude, accuracy, platform, appVersion } = body;

    // Validate GPS coordinates
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

    // Get job and verify provider is assigned
    const job = await jobRepository.getDocById(jobId);
    if (!job) {
      throw new NotFoundError("Job");
    }

    if (job.providerId?.toString() !== token.userId) {
      throw new ForbiddenError();
    }

    // Verify job is in proper state for check-in
    if (!["assigned", "in_progress"].includes(job.status)) {
      return NextResponse.json(
        {
          error: "Job is not in a state that allows check-in",
          status: job.status,
        },
        { status: 400 }
      );
    }

    // Perform GPS verification
    const result = await geoVerificationService.verifyCheckIn({
      jobId,
      providerId: token.userId,
      latitude,
      longitude,
      accuracy,
      platform,
      appVersion,
    });

    // If valid check-in, update job to in_progress
    if (result.isValid && job.status === "assigned") {
      try {
        const { escrowService } = await import("@/services/escrow.service");
        await escrowService.startJob(token, jobId, []);
      } catch (err) {
        console.error("[geo-check-in] Error transitioning job to in_progress:", err);
        // Don't fail the check-in response, but log the error
      }
    }

    return NextResponse.json(
      {
        success: result.isValid,
        checkIn: {
          distance: result.distance,
          isWithinGeofence: result.isWithinGeofence,
          status: result.status,
        },
        message: result.message,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[geo-check-in] Error:", error);

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: "You are not the assigned provider for this job" },
        { status: 403 }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Check-in verification failed" },
      { status: 500 }
    );
  }
}
