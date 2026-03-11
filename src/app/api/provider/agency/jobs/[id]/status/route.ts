import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import AgencyProfile from "@/models/AgencyProfile";
import Job from "@/models/Job";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  open:        ["assigned", "cancelled"],
  assigned:    ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
};

/** PATCH /api/provider/agency/jobs/[id]/status  body: { status } */
export const PATCH = withHandler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  if (user.role !== "provider") throw new ForbiddenError();

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) throw new ValidationError("Invalid job ID.");

  const { status: newStatus } = await req.json() as { status?: string };
  if (!newStatus) throw new ValidationError("status is required.");

  await connectDB();

  const agency = await AgencyProfile.findOne({ providerId: user.userId }).lean();
  if (!agency) throw new NotFoundError("AgencyProfile");

  const staffUserIds = [user.userId, ...agency.staff.map((s) => s.userId)];
  const job = await Job.findOne({ _id: id, providerId: { $in: staffUserIds } });
  if (!job) throw new NotFoundError("Job");

  const allowed = ALLOWED_TRANSITIONS[job.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new ValidationError(`Cannot transition from "${job.status}" to "${newStatus}".`);
  }

  job.status = newStatus as typeof job.status;
  await job.save();

  return NextResponse.json({ success: true, status: job.status });
});
