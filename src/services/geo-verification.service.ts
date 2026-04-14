import { jobRepository } from "@/repositories/job.repository";
import { userRepository } from "@/repositories/user.repository";
import { GeoCheckIn, IGeoCheckIn } from "@/models/GeoCheckIn";
import { activityRepository } from "@/repositories/activity.repository";
import { notificationRepository } from "@/repositories/notification.repository";
import type { IJob } from "@/types";

interface CheckInRequest {
  jobId: string;
  providerId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  platform: "ios" | "android" | "web";
  appVersion?: string;
}

interface CheckInResult {
  isValid: boolean;
  distance: number;
  status: "on_time" | "late" | "no_show";
  isWithinGeofence: boolean;
  message: string;
}

interface NoShowEvent {
  jobId: string;
  providerId: string;
  minutesLate: number;
  checkInAttempts: number;
  shouldEscalate: boolean;
  suggestReplacement: boolean;
}

/**
 * GeoVerificationService - Handles GPS-based provider attendance verification
 * - Validates check-ins against 100m geofence
 * - Detects no-shows (30+ minutes past scheduled time)
 * - Tracks repeated no-show patterns
 * - Escalates and suggests provider replacement
 */
class GeoVerificationService {
  private readonly GEOFENCE_RADIUS_METERS = 100; // 100m geofence
  private readonly NO_SHOW_THRESHOLD_MINUTES = 30; // 30+ mins = no-show
  private readonly EARTH_RADIUS_METERS = 6371000; // Earth's radius in meters

  /**
   * Verify provider check-in GPS coordinates against job location
   * Uses haversine formula to calculate distance
   */
  async verifyCheckIn(request: CheckInRequest): Promise<CheckInResult> {
    try {
      // Get job and its location
      const job = await jobRepository.getDocById(request.jobId);
      if (!job) {
        return {
          isValid: false,
          distance: Infinity,
          status: "no_show",
          isWithinGeofence: false,
          message: "Job not found",
        };
      }

      // Extract job coordinates from GeoJSON Point
      if (!job.coordinates?.coordinates) {
        return {
          isValid: false,
          distance: Infinity,
          status: "no_show",
          isWithinGeofence: false,
          message: "Job location not set",
        };
      }

      const [jobLng, jobLat] = job.coordinates.coordinates;

      // Calculate distance using haversine formula
      const distance = this.calculateDistance(
        request.latitude,
        request.longitude,
        jobLat,
        jobLng
      );

      // Check if within geofence
      const isWithinGeofence = distance <= this.GEOFENCE_RADIUS_METERS;

      // Determine check-in status (on_time, late, no_show)
      const status = await this.getCheckInStatus(job, distance);

      // Create GeoCheckIn record
      const attemptNumber = await this.getCheckInAttemptNumber(
        request.jobId,
        request.providerId
      );

      const checkIn: IGeoCheckIn = {
        jobId: new (require("mongoose").Types.ObjectId)(request.jobId),
        providerId: new (require("mongoose").Types.ObjectId)(request.providerId),
        latitude: request.latitude,
        longitude: request.longitude,
        accuracy: request.accuracy,
        distanceToJobLocation: distance,
        isValidCheckIn: isWithinGeofence,
        checkInStatus: status,
        attemptNumber,
        deviceInfo: {
          platform: request.platform,
          appVersion: request.appVersion || "unknown",
          timestamp: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save check-in record
      await GeoCheckIn.create(checkIn);

      // Log activity
      await activityRepository.log({
        userId: new (require("mongoose").Types.ObjectId)(request.providerId),
        eventType: "admin_ledger_entry",
        jobId: new (require("mongoose").Types.ObjectId)(request.jobId),
        metadata: {
          action: "geo_check_in",
          distance,
          isWithinGeofence,
          status,
          attemptNumber,
          accuracy: request.accuracy,
        },
      });

      return {
        isValid: isWithinGeofence && status !== "no_show",
        distance,
        status,
        isWithinGeofence,
        message: isWithinGeofence
          ? `Check-in confirmed (${Math.round(distance)}m from job)`
          : `Outside geofence (${Math.round(distance)}m from job, max 100m allowed)`,
      };
    } catch (error) {
      console.error("[GeoVerificationService] verifyCheckIn error:", error);
      return {
        isValid: false,
        distance: Infinity,
        status: "no_show",
        isWithinGeofence: false,
        message: error instanceof Error ? error.message : "Check-in verification failed",
      };
    }
  }

  /**
   * Calculate distance between two GPS coordinates (haversine formula)
   * Returns distance in meters
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_METERS * c; // distance in meters
  }

  /**
   * Determine if check-in is on-time, late, or no-show
   * Compares against job scheduled time (±30 min tolerance)
   */
  private async getCheckInStatus(
    job: Partial<IJob>,
    distance: number
  ): Promise<"on_time" | "late" | "no_show"> {
    // If outside geofence regardless of time, it's invalid
    if (distance > this.GEOFENCE_RADIUS_METERS) {
      return "no_show";
    }

    if (!job.scheduleDate) {
      return "on_time"; // No scheduled time, accept any check-in inside geofence
    }

    const now = new Date();
    const scheduledTime = new Date(job.scheduleDate);
    const minutesLate = Math.floor((now.getTime() - scheduledTime.getTime()) / 60000);

    if (minutesLate < 0) {
      return "on_time"; // Early
    } else if (minutesLate <= this.NO_SHOW_THRESHOLD_MINUTES) {
      return "on_time"; // Within 30 min grace period
    } else {
      return "late"; // 30+ mins late but finally checked in
    }
  }

  /**
   * Get check-in attempt number for this provider on this job
   */
  private async getCheckInAttemptNumber(
    jobId: string,
    providerId: string
  ): Promise<number> {
    const existingCheckIns = await GeoCheckIn.find({
      jobId: new (require("mongoose").Types.ObjectId)(jobId),
      providerId: new (require("mongoose").Types.ObjectId)(providerId),
    }).sort({ createdAt: -1 });

    return existingCheckIns.length + 1;
  }

  /**
   * Detect and handle no-show (30+ minutes past scheduled time with no valid check-in)
   */
  async processNoShow(jobId: string): Promise<NoShowEvent | null> {
    try {
      const job = await jobRepository.getDocById(jobId);
      if (!job || !job.scheduleDate) {
        return null;
      }

      const now = new Date();
      const minutesLate = Math.floor(
        (now.getTime() - new Date(job.scheduleDate).getTime()) / 60000
      );

      // Not yet at no-show threshold
      if (minutesLate < this.NO_SHOW_THRESHOLD_MINUTES) {
        return null;
      }

      // Check if provider already made a valid check-in
      const validCheckIn = await GeoCheckIn.findOne({
        jobId: new (require("mongoose").Types.ObjectId)(jobId),
        providerId: job.providerId,
        isValidCheckIn: true,
      });

      if (validCheckIn) {
        return null; // Provider already checked in, not a no-show
      }

      // Get check-in attempts
      const checkInAttempts = await GeoCheckIn.countDocuments({
        jobId: new (require("mongoose").Types.ObjectId)(jobId),
        providerId: job.providerId,
      });

      // Get provider's no-show pattern
      const noShowPattern = await this.flagNoShowPattern(job.providerId!.toString());

      // Log the no-show event
      await activityRepository.log({
        userId: new (require("mongoose").Types.ObjectId)(job.providerId?.toString() || ""),
        eventType: "admin_ledger_entry",
        jobId: new (require("mongoose").Types.ObjectId)(jobId),
        metadata: {
          action: "provider_no_show",
          minutesLate,
          checkInAttempts,
          noShowCount: noShowPattern.totalNoShows,
          noShowRate: noShowPattern.noShowRate,
        },
      });

      // Notify admin about no-show
      const adminNotification = {
        userId: null, // System notification
        type: "provider_no_show_alert",
        title: "Provider No-Show Detected",
        message: `Provider ${job.providerId} is 30+ minutes late for job ${jobId}`,
        data: {
          jobId,
          providerId: job.providerId?.toString(),
          minutesLate,
          jobTitle: job.title,
        },
        readAt: null,
      };

      await notificationRepository.create(adminNotification as any);

      return {
        jobId,
        providerId: job.providerId!.toString(),
        minutesLate,
        checkInAttempts,
        shouldEscalate: true,
        suggestReplacement: true,
      };
    } catch (error) {
      console.error("[GeoVerificationService] processNoShow error:", error);
      return null;
    }
  }

  /**
   * Analyze provider's no-show pattern and flag if problematic
   * Returns analytics on repeated no-show behavior
   */
  async flagNoShowPattern(
    providerId: string
  ): Promise<{
    totalJobs: number;
    totalNoShows: number;
    noShowRate: number;
    recentNoShows: number; // last 30 days
    shouldFlag: boolean;
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const objectId = new (require("mongoose").Types.ObjectId)(providerId);

      // Get all check-ins for this provider
      const allCheckIns = await GeoCheckIn.find({
        providerId: objectId,
      });

      // Get recent no-shows (last 30 days)
      const recentNoShows = await GeoCheckIn.countDocuments({
        providerId: objectId,
        checkInStatus: "no_show",
        createdAt: { $gte: thirtyDaysAgo },
      });

      // Get unique jobs this provider was assigned
      const uniqueJobs = await GeoCheckIn.distinct("jobId", {
        providerId: objectId,
      });

      const totalJobs = uniqueJobs.length;
      const totalNoShows = allCheckIns.filter(
        (c) => c.checkInStatus === "no_show"
      ).length;
      const noShowRate = totalJobs > 0 ? totalNoShows / totalJobs : 0;

      // Flag if 30%+ no-show rate or 3+ in last 30 days
      const shouldFlag = noShowRate >= 0.3 || recentNoShows >= 3;

      return {
        totalJobs,
        totalNoShows,
        noShowRate,
        recentNoShows,
        shouldFlag,
      };
    } catch (error) {
      console.error("[GeoVerificationService] flagNoShowPattern error:", error);
      return {
        totalJobs: 0,
        totalNoShows: 0,
        noShowRate: 0,
        recentNoShows: 0,
        shouldFlag: false,
      };
    }
  }

  /**
   * Generate analytics report on provider check-in patterns
   */
  async generateReport(
    providerId: string,
    days: number = 30
  ): Promise<{
    providerId: string;
    period: string;
    totalJobs: number;
    validCheckIns: number;
    lateCheckIns: number;
    noShows: number;
    avgDistance: number;
    onTimeRate: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const objectId = new (require("mongoose").Types.ObjectId)(providerId);

      const checkIns = await GeoCheckIn.find({
        providerId: objectId,
        createdAt: { $gte: startDate },
      });

      const uniqueJobs = new Set(checkIns.map((c) => c.jobId.toString()));

      const validCheckIns = checkIns.filter((c) => c.isValidCheckIn).length;
      const lateCheckIns = checkIns.filter(
        (c) => c.checkInStatus === "late"
      ).length;
      const noShows = checkIns.filter((c) => c.checkInStatus === "no_show").length;

      const avgDistance =
        checkIns.length > 0
          ? checkIns.reduce((sum, c) => sum + c.distanceToJobLocation, 0) /
            checkIns.length
          : 0;

      const onTimeRate =
        checkIns.length > 0 ? validCheckIns / checkIns.length : 0;

      return {
        providerId,
        period: `${days} days`,
        totalJobs: uniqueJobs.size,
        validCheckIns,
        lateCheckIns,
        noShows,
        avgDistance,
        onTimeRate,
      };
    } catch (error) {
      console.error("[GeoVerificationService] generateReport error:", error);
      return {
        providerId,
        period: `${days} days`,
        totalJobs: 0,
        validCheckIns: 0,
        lateCheckIns: 0,
        noShows: 0,
        avgDistance: 0,
        onTimeRate: 0,
      };
    }
  }
}

export const geoVerificationService = new GeoVerificationService();
