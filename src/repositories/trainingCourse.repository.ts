import mongoose from "mongoose";
import TrainingCourse from "@/models/TrainingCourse";
import type { TrainingCourseDocument } from "@/models/TrainingCourse";
import type { TrainingCourseCategory } from "@/types";
import { connectDB } from "@/lib/db";

export class TrainingCourseRepository {
  // ── Create ────────────────────────────────────────────────────────────────

  async create(data: {
    title: string;
    slug: string;
    description: string;
    category: TrainingCourseCategory;
    price: number;
    durationMinutes: number;
    badgeSlug: string;
    isPublished?: boolean;
    lessons?: Array<{
      title: string;
      content: string;
      durationMinutes: number;
      order: number;
    }>;
    createdBy: string;
  }): Promise<TrainingCourseDocument> {
    await connectDB();
    return TrainingCourse.create({
      ...data,
      createdBy: new mongoose.Types.ObjectId(data.createdBy),
      isPublished: data.isPublished ?? false,
      lessons: data.lessons ?? [],
    }) as unknown as TrainingCourseDocument;
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  /** All courses (admin view), sorted newest first. Capped at 500 rows. */
  async findAll(): Promise<TrainingCourseDocument[]> {
    await connectDB();
    return TrainingCourse.find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .lean() as unknown as TrainingCourseDocument[];
  }

  /** Only published courses, sorted by category then title. Capped at 500 rows. */
  async findPublished(category?: TrainingCourseCategory): Promise<TrainingCourseDocument[]> {
    await connectDB();
    const filter: Record<string, unknown> = { isPublished: true };
    if (category) filter.category = category;
    return TrainingCourse.find(filter)
      .sort({ category: 1, title: 1 })
      .limit(500)
      .lean() as unknown as TrainingCourseDocument[];
  }

  async findById(id: string): Promise<TrainingCourseDocument | null> {
    await connectDB();
    return TrainingCourse.findById(id).lean() as unknown as TrainingCourseDocument | null;
  }

  async findBySlug(slug: string): Promise<TrainingCourseDocument | null> {
    await connectDB();
    return TrainingCourse.findOne({ slug })
      .lean() as unknown as TrainingCourseDocument | null;
  }

  // ── Updates ───────────────────────────────────────────────────────────────

  async updateById(
    id: string,
    data: Partial<{
      title: string;
      slug: string;
      description: string;
      category: TrainingCourseCategory;
      price: number;
      durationMinutes: number;
      badgeSlug: string;
      isPublished: boolean;
      lessons: Array<{
        title: string;
        content: string;
        durationMinutes: number;
        order: number;
      }>;
    }>
  ): Promise<TrainingCourseDocument | null> {
    await connectDB();
    return TrainingCourse.findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean() as unknown as TrainingCourseDocument | null;
  }

  async incrementEnrollment(id: string): Promise<void> {
    await connectDB();
    await TrainingCourse.findByIdAndUpdate(id, { $inc: { enrollmentCount: 1 } });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async deleteById(id: string): Promise<boolean> {
    await connectDB();
    const result = await TrainingCourse.findByIdAndDelete(id);
    return result !== null;
  }
}

export const trainingCourseRepository = new TrainingCourseRepository();
