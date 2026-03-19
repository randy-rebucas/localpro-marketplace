import mongoose from "mongoose";
import TrainingEnrollment from "@/models/TrainingEnrollment";
import type { TrainingEnrollmentDocument } from "@/models/TrainingEnrollment";
import type { TrainingEnrollmentStatus } from "@/types";
import { connectDB } from "@/lib/db";

export class TrainingEnrollmentRepository {
  // ── Create ────────────────────────────────────────────────────────────────

  async create(data: {
    providerId: string;
    courseId: string;
    courseTitle: string;
    amountPaid: number;
    walletTxId?: string | null;
    paymongoSessionId?: string | null;
    ledgerJournalId?: string | null;
  }): Promise<TrainingEnrollmentDocument> {
    await connectDB();
    return TrainingEnrollment.create({
      providerId: new mongoose.Types.ObjectId(data.providerId),
      courseId:   new mongoose.Types.ObjectId(data.courseId),
      courseTitle: data.courseTitle,
      amountPaid: data.amountPaid,
      status: "enrolled",
      completedLessons: [],
      walletTxId: data.walletTxId ?? null,
      paymongoSessionId: data.paymongoSessionId ?? null,
      ledgerJournalId: data.ledgerJournalId ?? null,
    }) as unknown as TrainingEnrollmentDocument;
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findByProvider(providerId: string): Promise<TrainingEnrollmentDocument[]> {
    await connectDB();
    return TrainingEnrollment.find({ providerId: new mongoose.Types.ObjectId(providerId) })
      .populate("courseId", "title slug category badgeSlug durationMinutes lessons")
      .sort({ createdAt: -1 })
      .lean() as unknown as TrainingEnrollmentDocument[];
  }

  async findByProviderAndCourse(
    providerId: string,
    courseId: string
  ): Promise<TrainingEnrollmentDocument | null> {
    await connectDB();
    return TrainingEnrollment.findOne({
      providerId: new mongoose.Types.ObjectId(providerId),
      courseId:   new mongoose.Types.ObjectId(courseId),
    }).lean() as unknown as TrainingEnrollmentDocument | null;
  }

  async findById(id: string): Promise<TrainingEnrollmentDocument | null> {
    await connectDB();
    return TrainingEnrollment.findById(id)
      .populate("courseId", "title slug category badgeSlug durationMinutes lessons")
      .lean() as unknown as TrainingEnrollmentDocument | null;
  }

  async existsByProviderAndCourse(providerId: string, courseId: string): Promise<boolean> {
    await connectDB();
    const count = await TrainingEnrollment.countDocuments({
      providerId: new mongoose.Types.ObjectId(providerId),
      courseId:   new mongoose.Types.ObjectId(courseId),
    });
    return count > 0;
  }

  // ── Updates ───────────────────────────────────────────────────────────────

  async markLessonComplete(enrollmentId: string, lessonId: string): Promise<TrainingEnrollmentDocument | null> {
    await connectDB();
    return TrainingEnrollment.findByIdAndUpdate(
      enrollmentId,
      { $addToSet: { completedLessons: new mongoose.Types.ObjectId(lessonId) } },
      { new: true }
    ).lean() as unknown as TrainingEnrollmentDocument | null;
  }

  async updateById(
    id: string,
    data: Partial<{
      status: TrainingEnrollmentStatus;
      completedAt: Date | null;
      badgeGranted: boolean;
      ledgerJournalId: string | null;
      paymongoSessionId: string | null;
    }>
  ): Promise<TrainingEnrollmentDocument | null> {
    await connectDB();
    return TrainingEnrollment.findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean() as unknown as TrainingEnrollmentDocument | null;
  }
}

export const trainingEnrollmentRepository = new TrainingEnrollmentRepository();
