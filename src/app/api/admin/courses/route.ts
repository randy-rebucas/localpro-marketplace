import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingCourseRepository } from "@/repositories/trainingCourse.repository";
import { ValidationError } from "@/lib/errors";
import type { TrainingCourseCategory } from "@/types";

import { checkRateLimit } from "@/lib/rateLimit";
const LessonSchema = z.object({
  title:           z.string().min(1).max(200),
  content:         z.string().min(1),
  durationMinutes: z.number().int().min(1),
  order:           z.number().int().min(0),
});

const CreateCourseSchema = z.object({
  title:           z.string().min(3).max(200),
  slug:            z.string().min(3).max(200).regex(/^[a-z0-9-]+$/),
  description:     z.string().min(10),
  category:        z.enum(["basic", "advanced", "safety", "custom"]),
  price:           z.number().min(0),
  durationMinutes: z.number().int().min(1),
  badgeSlug:       z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  isPublished:     z.boolean().optional(),
  lessons:         z.array(LessonSchema).optional(),
});

/**
 * GET /api/admin/courses
 * Returns all courses (published and drafts) for admin management.
 */
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireCapability(user, "manage_courses");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const courses = await trainingCourseRepository.findAll();
  return NextResponse.json({ courses });
});

/**
 * POST /api/admin/courses
 * Create a new training course.
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCapability(user, "manage_courses");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = CreateCourseSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const course = await trainingCourseRepository.create({
    ...parsed.data,
    category: parsed.data.category as TrainingCourseCategory,
    createdBy: user.userId,
  });

  return NextResponse.json({ course }, { status: 201 });
});
