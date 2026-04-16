import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser, requireRole } from "@/lib/auth";
import { jobRepository, userRepository, notificationRepository } from "@/repositories";
import { connectDB } from "@/lib/db";
import { jobService } from "@/services";
import { escalationService, EscalationReason } from "@/services/escalation.service";
import { pushNotification } from "@/lib/events";

interface BookingRequest {
  jobData: {
    jobTitle: string;
    description: string;
    budget: number;
    category: string;
    location: string;
    urgency?: "standard" | "same_day" | "rush";
  };
  providerId: string;
}

/** POST /api/ai/chat/confirm-booking - Create job and assign provider */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "client");

  const { jobData, providerId } = (await req.json()) as BookingRequest;

  if (!jobData || !providerId) {
    return NextResponse.json(
      { error: "Job data and provider ID are required" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // Validate provider exists
    const provider = await userRepository.findById(providerId);
    if (!provider || provider.role !== "provider") {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Create the job
    const scheduleDate = new Date();
    scheduleDate.setDate(scheduleDate.getDate() + 1); // Default to tomorrow

    const newJob = {
      clientId: user.userId,
      title: jobData.jobTitle,
      description: jobData.description,
      category: jobData.category,
      budget: jobData.budget,
      location: jobData.location,
      scheduleDate: scheduleDate.toISOString(),
      urgency: jobData.urgency || "standard",
      status: "assigned",
      providerId: providerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const jobResult = await jobRepository.create(newJob as any);
    const jobId = (jobResult as any)?._id || (jobResult as any)?.id;

    // Evaluate job for escalation risks
    const escalation = await escalationService.evaluateNewJob(jobId);

    // Handle critical escalations (auto-reject)
    if (escalation && escalation.reason === EscalationReason.HIGH_FRAUD_SCORE && escalation.severity === "critical") {
      // Reject the job
      await jobRepository.updateById(jobId, { status: "rejected" });

      // Notify admin — resolve actual admin user ID from DB
      const adminUser = await userRepository.findAdmin();
      if (adminUser) {
        const adminNotif = await notificationRepository.create({
          userId: String(adminUser._id),
          type: "job_rejected",
          title: "Job Auto-Rejected - Critical Fraud Indicators",
          message: escalation.action,
          data: { jobId, escalationId: escalation.reason },
        });
        pushNotification(String(adminUser._id), adminNotif);
      }

      return NextResponse.json({
        success: false,
        jobId,
        message: "Your job could not be posted due to policy violations. The team will contact you shortly.",
        escalation: {
          reason: escalation.reason,
          severity: escalation.severity,
          action: escalation.action,
        },
      }, { status: 400 });
    }

    // Handle moderate escalations (hold for review)
    if (escalation && (escalation.severity === "high" || escalation.severity === "medium")) {
      // Update job status to pending_validation for admin review
      await jobRepository.updateById(jobId, { status: "pending_validation" });

      // Notify client
      const clientNotif = await notificationRepository.create({
        userId: user.userId,
        type: "job_pending_review",
        title: "Your Job is Under Review",
        message: "Your job posting is being reviewed by our team to ensure quality. You'll be notified once it's approved.",
        data: { jobId },
      });
      pushNotification(user.userId, clientNotif);

      return NextResponse.json({
        success: true,
        jobId,
        message: "Booking created! Your job is under review and will be posted shortly.",
        status: "pending_validation",
        escalation: {
          reason: escalation.reason,
          severity: escalation.severity,
          action: escalation.action,
        },
      });
    }

    // No escalation or low-severity → proceed normally
    return NextResponse.json({
      success: true,
      jobId,
      message: "Booking confirmed! Provider has been notified.",
      booking: {
        jobId,
        clientId: user.userId,
        providerId,
        status: "assigned",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[confirm-booking] error:", err);
    return NextResponse.json(
      { error: "Failed to confirm booking" },
      { status: 500 }
    );
  }
});
