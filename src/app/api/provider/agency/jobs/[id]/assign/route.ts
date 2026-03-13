import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import AgencyProfile from "@/models/AgencyProfile";
import Job from "@/models/Job";
import User from "@/models/User";
import { sendAgencyJobAssignedEmail } from "@/lib/email";

/** POST /api/provider/agency/jobs/[id]/assign  body: { staffId } */
export const POST = withHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) throw new ValidationError("Invalid job ID.");

  const { staffId } = await req.json() as { staffId?: string };
  if (!staffId || !mongoose.isValidObjectId(staffId)) throw new ValidationError("staffId is required.");

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId });
  if (!agency) throw new NotFoundError("AgencyProfile");

  // staffId is the subdocument _id; find the matching staff entry
  const staffEntry = agency.staff.find((s) => String(s._id) === staffId);
  if (!staffEntry) throw new NotFoundError("Staff member not found in agency.");

  const job = await Job.findOne({ _id: id, providerId: { $in: [user.userId, ...agency.staff.map((s) => s.userId)] } });
  if (!job) throw new NotFoundError("Job");
  if (["completed", "cancelled", "disputed"].includes(job.status)) {
    throw new ValidationError(`Cannot assign a job with status "${job.status}".`);
  }

  job.providerId = staffEntry.userId as mongoose.Types.ObjectId;
  if (job.status === "open") job.status = "assigned";
  await job.save();

  // ── Notify the assigned staff member ────────────────────────────────────────
  const workerUserId = String(staffEntry.userId);
  try {
    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: workerUserId,
      type: "agency_job_assigned",
      title: "You've been assigned a job",
      message: `${agency.name} has assigned you to: "${job.title}".`,
      data: { jobId: job._id!.toString(), jobTitle: job.title },
    });
  } catch {
    // Non-critical — don't fail the assignment if notification errors
  }

  // Fire-and-forget email to the worker
  User.findById(workerUserId, "email name").lean().then((worker) => {
    if (worker?.email) {
      sendAgencyJobAssignedEmail(
        worker.email,
        worker.name,
        agency.name,
        job.title,
        job._id!.toString()
      ).catch((err) => console.error("[AGENCY_ASSIGN] Email failed:", err));
    }
  }).catch(() => undefined);

  return NextResponse.json({ success: true, assignedUserId: workerUserId });
});
