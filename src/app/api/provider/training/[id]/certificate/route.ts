import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import TrainingCourse from "@/models/TrainingCourse";
import TrainingEnrollment from "@/models/TrainingEnrollment";
import User from "@/models/User";

import { checkRateLimit } from "@/lib/rateLimit";
/**
 * GET /api/provider/training/[id]/certificate
 * Returns certificate data for a completed course.
 */
export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`provider:training:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { id } = await params;

  await connectDB();

  const [course, enrollment, dbUser] = await Promise.all([
    TrainingCourse.findById(id).select("title category badgeSlug").lean(),
    TrainingEnrollment.findOne({ providerId: user.userId, courseId: id })
      .select("status completedAt _id")
      .lean(),
    User.findById(user.userId).select("name").lean(),
  ]);

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  if (!enrollment || enrollment.status !== "completed") {
    return NextResponse.json({ error: "Course not completed yet" }, { status: 403 });
  }

  const enrollmentDoc = enrollment as {
    _id: unknown;
    status: string;
    completedAt?: Date | null;
  };
  const courseDoc = course as {
    title: string;
    category: string;
    badgeSlug: string;
  };
  const userDoc = dbUser as { name?: string } | null;

  // Generate a short certificate number from the enrollment ID
  const certNumber = String(enrollmentDoc._id).slice(-8).toUpperCase();

  return NextResponse.json({
    providerName:   userDoc?.name ?? "Provider",
    courseTitle:    courseDoc.title,
    category:       courseDoc.category,
    badgeSlug:      courseDoc.badgeSlug,
    completedAt:    enrollmentDoc.completedAt?.toISOString() ?? new Date().toISOString(),
    certificateNumber: `LP-${certNumber}`,
  });
});
