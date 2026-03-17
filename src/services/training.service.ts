/**
 * TrainingService — manages training / upskilling course purchases and enrollment.
 *
 * Providers can browse published courses and enroll via two payment paths:
 *   1. Wallet   — debit provider wallet instantly; enrollment status: "enrolled"
 *   2. PayMongo — create checkout session; enrollment activated on webhook
 *
 * After enrolling, providers mark individual lessons complete.
 * When all lessons are marked complete, the course is marked complete and a badge
 * is appended to the provider's ProviderProfile.earnedBadges array.
 *
 * Revenue account: 4970 — Training Course Revenue
 */

import mongoose from "mongoose";
import { walletRepository } from "@/repositories/wallet.repository";
import { trainingCourseRepository } from "@/repositories/trainingCourse.repository";
import { trainingEnrollmentRepository } from "@/repositories/trainingEnrollment.repository";
import { ledgerService } from "@/services/ledger.service";
import { createCheckoutSession } from "@/lib/paymongo";
import { ForbiddenError, UnprocessableError, NotFoundError } from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import type { TrainingCourseCategory } from "@/types";
import { connectDB } from "@/lib/db";
import ProviderProfile from "@/models/ProviderProfile";
import { getCheckoutSession, getPaymentIntent } from "@/lib/paymongo";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";

export class TrainingService {
  // ─────────────────────────────────────────────────────────────────────────
  // Catalog
  // ─────────────────────────────────────────────────────────────────────────

  /** List all published courses, with enrollment status attached for the caller */
  async listPublished(user: TokenPayload, category?: TrainingCourseCategory) {
    const [courses, enrollments] = await Promise.all([
      trainingCourseRepository.findPublished(category),
      trainingEnrollmentRepository.findByProvider(user.userId),
    ]);

    // findByProvider populates courseId, so after .lean() it becomes a plain object
    // { _id: ObjectId, title, ... } — must use ._id.toString(), not .toString()
    const enrolledMap = new Map(
      enrollments.map((e) => {
        const cId = e as unknown as { courseId: { _id?: { toString(): string }; toString(): string } };
        const key = cId.courseId?._id?.toString() ?? cId.courseId?.toString();
        return [key, e];
      })
    );

    return courses.map((c) => {
      const cId = (c as unknown as { _id: { toString(): string } })._id.toString();
      const enrollment = enrolledMap.get(cId);
      const e = enrollment as unknown as {
        status: string;
        completedLessons: unknown[];
      } | undefined;
      return {
        ...c,
        enrolled: !!enrollment,
        enrollmentStatus: e ? e.status : null,
        completedLessonsCount: e ? (e.completedLessons?.length ?? 0) : 0,
      };
    });
  }

  /**
   * Get a single published course.
   * Lesson content is only included if the caller is enrolled (or is admin/staff).
   */
  async getCourse(user: TokenPayload, courseId: string) {
    const course = await trainingCourseRepository.findById(courseId);
    if (!course || !(course as unknown as { isPublished: boolean }).isPublished) {
      throw new NotFoundError("Course not found.");
    }

    let enrollment = null;
    if (user.role === "provider") {
      enrollment = await trainingEnrollmentRepository.findByProviderAndCourse(
        user.userId,
        courseId
      );
    }

    const isEnrolled = !!enrollment || user.role === "admin" || user.role === "staff";
    const courseObj = course as unknown as { lessons: Array<{ content: string; _id: unknown; title: string; durationMinutes: number; order: number }> };

    return {
      ...course,
      lessons: courseObj.lessons.map((l) =>
        isEnrolled ? l : { _id: l._id, title: l.title, durationMinutes: l.durationMinutes, order: l.order }
      ),
      enrollment,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Enrollment — Wallet path
  // ─────────────────────────────────────────────────────────────────────────

  async enrollFromWallet(user: TokenPayload, courseId: string) {
    if (user.role !== "provider")
      throw new ForbiddenError("Only providers can enroll in training courses.");

    const course = await trainingCourseRepository.findById(courseId);
    if (!course || !(course as unknown as { isPublished: boolean }).isPublished) {
      throw new NotFoundError("Course not found.");
    }

    const alreadyEnrolled = await trainingEnrollmentRepository.existsByProviderAndCourse(
      user.userId,
      courseId
    );
    if (alreadyEnrolled) {
      throw new UnprocessableError("You are already enrolled in this course.");
    }

    const price = (course as unknown as { price: number }).price;
    const balance = await walletRepository.getBalance(user.userId);

    if (balance < price) {
      throw new UnprocessableError(
        `Insufficient wallet balance. You have ₱${balance.toLocaleString()} but this course costs ₱${price.toLocaleString()}.`
      );
    }

    const courseTitle = (course as unknown as { title: string }).title;

    // Debit wallet
    const { txDoc } = await walletRepository.applyTransaction(
      user.userId,
      -price,
      "training_course_payment",
      `Training course — ${courseTitle}`
    );

    // Create enrollment
    const enrollment = await trainingEnrollmentRepository.create({
      providerId: user.userId,
      courseId,
      courseTitle,
      amountPaid: price,
      walletTxId: (txDoc as { _id: { toString(): string } })._id.toString(),
    });

    const enrollmentId = (enrollment as unknown as { _id: { toString(): string } })._id.toString();

    // Increment course counter
    await trainingCourseRepository.incrementEnrollment(courseId);

    // Post ledger journal
    const journalId = `training-enrollment-${enrollmentId}`;
    await ledgerService.postTrainingCoursePayment(
      {
        journalId,
        entityType: "training_enrollment",
        entityId: enrollmentId,
        providerId: user.userId,
        initiatedBy: user.userId,
      },
      price,
      "wallet"
    );

    await trainingEnrollmentRepository.updateById(enrollmentId, { ledgerJournalId: journalId });

    // Notification
    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: user.userId,
      type: "payment_confirmed",
      title: "Enrollment confirmed!",
      message: `You're now enrolled in "${courseTitle}". ₱${price.toLocaleString()} was deducted from your wallet.`,
    });

    return { activated: true, enrollment };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Enrollment — PayMongo path
  // ─────────────────────────────────────────────────────────────────────────

  async initiatePayMongoCheckout(user: TokenPayload, courseId: string) {
    if (user.role !== "provider")
      throw new ForbiddenError("Only providers can enroll in training courses.");

    const course = await trainingCourseRepository.findById(courseId);
    if (!course || !(course as unknown as { isPublished: boolean }).isPublished) {
      throw new NotFoundError("Course not found.");
    }

    const alreadyEnrolled = await trainingEnrollmentRepository.existsByProviderAndCourse(
      user.userId,
      courseId
    );
    if (alreadyEnrolled) {
      throw new UnprocessableError("You are already enrolled in this course.");
    }

    if (!process.env.PAYMONGO_SECRET_KEY) {
      return this.enrollFromWallet(user, courseId);
    }

    const price = (course as unknown as { price: number }).price;
    const courseTitle = (course as unknown as { title: string }).title;

    const session = await createCheckoutSession({
      amountPHP:    price,
      description:  `Training course — ${courseTitle}`,
      lineItemName: courseTitle,
      successUrl:   `${APP_URL}/api/payment-return?to=${encodeURIComponent(`/provider/training/${courseId}?payment=success`)}`,
      cancelUrl:    `${APP_URL}/provider/training/${courseId}?payment=cancelled`,
      metadata: {
        type:       "training",
        courseId,
        providerId: user.userId,
        amountPHP:  String(price),
      },
    });

    return {
      activated: false,
      checkoutUrl: session.checkoutUrl,
      checkoutSessionId: session.id,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Enrollment — direct checkout session verification (instant activation)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Called when the provider returns from PayMongo with a session ID.
   * Verifies the session directly with PayMongo — no webhook dependency.
   * Idempotent: safe to call multiple times for the same session.
   */
  async activateEnrollmentFromSession(user: TokenPayload, courseId: string, sessionId: string) {
    if (user.role !== "provider")
      throw new ForbiddenError("Only providers can activate enrollments.");

    // Already enrolled? Return immediately (idempotent).
    const alreadyEnrolled = await trainingEnrollmentRepository.existsByProviderAndCourse(
      user.userId,
      courseId
    );
    if (alreadyEnrolled) return { activated: true };

    // ── Step 1: get the checkout session ─────────────────────────────────
    let session: Awaited<ReturnType<typeof getCheckoutSession>>;
    try {
      session = await getCheckoutSession(sessionId);
    } catch (err) {
      console.error("[activate] getCheckoutSession failed:", err);
      throw new UnprocessableError(
        "Could not verify payment session. Please wait a moment and try again."
      );
    }

    // ── Step 2: resolve payment status ───────────────────────────────────
    // PayMongo may or may not expand payment_intent.attributes in the session response.
    // Also accept session.status === "completed" as a direct paid signal.
    let paymentSucceeded =
      session.paymentIntentStatus === "succeeded" ||
      session.status === "completed" ||
      session.status === "paid";

    if (!paymentSucceeded && session.paymentIntentId) {
      try {
        const pi = await getPaymentIntent(session.paymentIntentId);
        paymentSucceeded = pi.status === "succeeded";
      } catch (err) {
        console.error("[activate] getPaymentIntent failed:", err);
        // Don't block activation on this — fall back to session status check below
      }
    }

    if (!paymentSucceeded) {
      throw new UnprocessableError(
        "Payment has not been confirmed yet. Please wait a moment and try again."
      );
    }

    // ── Step 3: activate enrollment ───────────────────────────────────────
    const course = await trainingCourseRepository.findById(courseId);
    if (!course) throw new NotFoundError("Course not found.");

    const price = (course as unknown as { price: number }).price;

    try {
      await this.activateFromWebhook(user.userId, courseId, sessionId, price);
    } catch (err) {
      // If enrollment was created by webhook in the tiny window between our idempotency
      // check above and now, treat as success rather than failing.
      const isAlreadyEnrolled = await trainingEnrollmentRepository.existsByProviderAndCourse(
        user.userId,
        courseId
      );
      if (isAlreadyEnrolled) return { activated: true };
      console.error("[activate] activateFromWebhook failed:", err);
      throw new UnprocessableError(
        "Enrollment could not be activated. Please contact support if this persists."
      );
    }

    return { activated: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Webhook activation
  // ─────────────────────────────────────────────────────────────────────────

  async activateFromWebhook(
    providerId: string,
    courseId: string,
    sessionId: string,
    amountPaid: number
  ) {
    // Idempotency — skip if enrollment already exists for this session
    const all = await trainingEnrollmentRepository.findByProvider(providerId);
    const existing = all.find(
      (e) => (e as unknown as { paymongoSessionId: string | null }).paymongoSessionId === sessionId
    );
    if (existing) return;

    const course = await trainingCourseRepository.findById(courseId);
    if (!course) return;

    const courseTitle = (course as unknown as { title: string }).title;

    const enrollment = await trainingEnrollmentRepository.create({
      providerId,
      courseId,
      courseTitle,
      amountPaid,
      paymongoSessionId: sessionId,
    });

    const enrollmentId = (enrollment as unknown as { _id: { toString(): string } })._id.toString();

    await trainingCourseRepository.incrementEnrollment(courseId);

    const journalId = `training-enrollment-${enrollmentId}`;
    await ledgerService.postTrainingCoursePayment(
      {
        journalId,
        entityType: "training_enrollment",
        entityId: enrollmentId,
        providerId,
        initiatedBy: providerId,
      },
      amountPaid,
      "gateway"
    );

    await trainingEnrollmentRepository.updateById(enrollmentId, { ledgerJournalId: journalId });

    // Notification
    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: providerId,
      type: "payment_confirmed",
      title: "Enrollment confirmed!",
      message: `You're now enrolled in "${courseTitle}".`,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Lesson completion + badge
  // ─────────────────────────────────────────────────────────────────────────

  async completeLesson(user: TokenPayload, enrollmentId: string, lessonId: string) {
    const enrollment = await trainingEnrollmentRepository.findById(enrollmentId);
    if (!enrollment) throw new NotFoundError("Enrollment not found.");

    const ownerId = (enrollment as unknown as { providerId: { toString(): string } }).providerId.toString();
    if (ownerId !== user.userId)
      throw new ForbiddenError("You can only update your own enrollment.");

    const enrollStatus = (enrollment as unknown as { status: string }).status;
    if (enrollStatus === "completed")
      throw new UnprocessableError("Course is already completed.");

    const updated = await trainingEnrollmentRepository.markLessonComplete(enrollmentId, lessonId);
    return { enrollment: updated };
  }

  async completeCourse(user: TokenPayload, enrollmentId: string) {
    const enrollment = await trainingEnrollmentRepository.findById(enrollmentId);
    if (!enrollment) throw new NotFoundError("Enrollment not found.");

    const ownerId = (enrollment as unknown as { providerId: { toString(): string } }).providerId.toString();
    if (ownerId !== user.userId)
      throw new ForbiddenError("You can only update your own enrollment.");

    const enrollStatus = (enrollment as unknown as { status: string }).status;
    if (enrollStatus === "completed")
      throw new UnprocessableError("Course is already completed.");

    const courseData = enrollment as unknown as {
      courseId: { _id?: { toString(): string }; lessons: Array<{ _id: { toString(): string } }> };
      completedLessons: Array<{ toString(): string }>;
    };

    const totalLessons = courseData.courseId?.lessons?.length ?? 0;
    const doneCount = courseData.completedLessons?.length ?? 0;

    if (totalLessons > 0 && doneCount < totalLessons) {
      throw new UnprocessableError(
        `Complete all ${totalLessons} lessons before marking the course done (${doneCount}/${totalLessons} completed).`
      );
    }

    const updated = await trainingEnrollmentRepository.updateById(enrollmentId, {
      status: "completed",
      completedAt: new Date(),
      badgeGranted: true,
    });

    // Grant badge on ProviderProfile
    await this.grantBadge(user.userId, enrollment);

    // Notification
    const { notificationService } = await import("@/services/notification.service");
    const courseTitle = (enrollment as unknown as { courseTitle: string }).courseTitle;
    await notificationService.push({
      userId: user.userId,
      type: "system_notice",
      title: "Course completed! 🎓",
      message: `Congratulations! You've completed "${courseTitle}" and earned your badge.`,
    });

    return { enrollment: updated };
  }

  private async grantBadge(
    providerId: string,
    enrollment: unknown
  ) {
    await connectDB();
    const e = enrollment as {
      courseTitle: string;
      courseId: { badgeSlug?: string } | string;
    };

    let badgeSlug: string;
    if (typeof e.courseId === "object" && e.courseId !== null && "badgeSlug" in e.courseId) {
      badgeSlug = (e.courseId as { badgeSlug: string }).badgeSlug;
    } else {
      // courseId wasn't populated — fetch course
      const course = await trainingCourseRepository.findById(
        typeof e.courseId === "string" ? e.courseId : (e.courseId as { toString(): string }).toString()
      );
      badgeSlug = (course as unknown as { badgeSlug: string })?.badgeSlug ?? "unknown";
    }

    await ProviderProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(providerId) },
      {
        $addToSet: {
          earnedBadges: {
            badgeSlug,
            courseTitle: e.courseTitle,
            earnedAt: new Date(),
          },
        },
      }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // My enrollments
  // ─────────────────────────────────────────────────────────────────────────

  async getMyEnrollments(user: TokenPayload) {
    return trainingEnrollmentRepository.findByProvider(user.userId);
  }
}

export const trainingService = new TrainingService();
