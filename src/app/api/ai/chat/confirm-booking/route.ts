import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { jobRepository, userRepository } from "@/repositories";
import { connectDB } from "@/lib/db";
import { jobService } from "@/services";
import type { IJob } from "@/types";

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

  if (user.role !== "client") {
    return NextResponse.json(
      { error: "Only clients can create jobs" },
      { status: 403 }
    );
  }

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
