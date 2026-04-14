import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { jobRepository } from "@/repositories";
import { connectDB } from "@/lib/db";
import { isValidObjectId } from "mongoose";

interface JobStatusResponse {
  jobId: string;
  status: string;
  assignedProviderName?: string;
  providerPhone?: string;
  estimatedArrivalTime?: string;
  providerLocation?: string;
  clientMessage: string;
}

/** POST /api/ai/chat/job-status - Get job status and provider location */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const { jobId } = await req.json();

  if (!jobId || !isValidObjectId(jobId)) {
    return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
  }

  try {
    await connectDB();

    const job = await jobRepository.findById(jobId) as any;

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Verify user is either client or assigned provider
    if (user.userId !== String(job.clientId) && user.userId !== String(job.providerId)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Build status response based on job status
    let statusMessage = "";
    let eta = "";

    switch (job.status) {
      case "pending_validation":
        statusMessage = "Your job is being reviewed. You'll hear from us soon!";
        break;
      case "open":
        statusMessage = "Your job is posted and waiting for providers to quote.";
        break;
      case "assigned":
        statusMessage = job.assignedProviderName
          ? `${job.assignedProviderName} has been assigned to your job.`
          : "A provider has been assigned.";
        eta = "Provider will contact you shortly.";
        break;
      case "in_progress":
        statusMessage = "Your job is currently in progress.";
        eta = job.estimatedCompletionTime 
          ? `Estimated completion: ${job.estimatedCompletionTime}`
          : "Provider is working on your job.";
        break;
      case "completed":
        statusMessage = "Your job has been completed!";
        break;
      case "disputed":
        statusMessage = "There's a dispute on this job. Support team is reviewing.";
        break;
      case "cancelled":
        statusMessage = "This job has been cancelled.";
        break;
      default:
        statusMessage = `Job status: ${job.status}`;
    }

    const response: JobStatusResponse = {
      jobId: String(job._id),
      status: job.status,
      assignedProviderName: job.assignedProviderName,
      providerPhone: job.providerPhone,
      estimatedArrivalTime: eta || undefined,
      providerLocation: job.providerLocation,
      clientMessage: `${statusMessage}${eta ? ` ${eta}` : ""}`,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[job-status] error:", err);
    return NextResponse.json(
      { error: "Failed to get job status" },
      { status: 500 }
    );
  }
});
