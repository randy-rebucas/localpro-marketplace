import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingCourseRepository } from "@/repositories/trainingCourse.repository";
import { ValidationError, NotFoundError } from "@/lib/errors";

import { checkRateLimit } from "@/lib/rateLimit";
const LessonSchema = z.object({
  title:           z.string().min(1).max(200),
  content:         z.string().min(1),
  durationMinutes: z.number().int().min(1),
  order:           z.number().int().min(0),
});

const UpdateCourseSchema = z.object({
  title:           z.string().min(3).max(200).optional(),
  slug:            z.string().min(3).max(200).regex(/^[a-z0-9-]+$/).optional(),
  description:     z.string().min(10).optional(),
  category:        z.enum(["basic", "advanced", "safety", "custom"]).optional(),
  price:           z.number().min(0).optional(),
  durationMinutes: z.number().int().min(1).optional(),
  badgeSlug:       z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  isPublished:     z.boolean().optional(),
  lessons:         z.array(LessonSchema).optional(),
});

/**
 * GET /api/admin/courses/[id]
 * Returns the course + enrollment stats.
 */
export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCapability(user, "manage_courses");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  const course = await trainingCourseRepository.findById(id);
  if (!course) throw new NotFoundError("Course not found.");

  return NextResponse.json({ course });
});

/**
 * PATCH /api/admin/courses/[id]
 * Update an existing course.
 */
export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCapability(user, "manage_courses");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateCourseSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const course = await trainingCourseRepository.updateById(id, parsed.data);
  if (!course) throw new NotFoundError("Course not found.");

  return NextResponse.json({ course, message: "Course updated." });
});

/**
 * DELETE /api/admin/courses/[id]
 * Delete a course. Only possible if it has zero enrollments.
 */
export const DELETE = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCapability(user, "manage_courses");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;

  const course = await trainingCourseRepository.findById(id);
  if (!course) throw new NotFoundError("Course not found.");

  const enrollmentCount = (course as unknown as { enrollmentCount: number }).enrollmentCount;
  if (enrollmentCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete a course with ${enrollmentCount} active enrollment(s). Unpublish it instead.` },
      { status: 422 }
    );
  }

  await trainingCourseRepository.deleteById(id);
  return NextResponse.json({ success: true });
});
