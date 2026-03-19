import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import { reviewRepository } from "@/repositories/review.repository";
import ReviewsClient from "./_components/ReviewsClient";
import type { PopulatedJob } from "./_components/ReviewsClient";
import type { JobDocument } from "@/models/Job";

export default async function ClientReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [allJobsResult, existingReviews] = await Promise.all([
    jobRepository.findAllForClient(user.userId, { page: 1, limit: 100 }),
    reviewRepository.findWithPopulation({ clientId: user.userId }),
  ]);

  const reviewedJobIds = new Set(
    existingReviews.map((r) => {
      const j = r.jobId as unknown;
      if (j && typeof j === "object" && "_id" in (j as object)) {
        return (j as { _id: { toString(): string } })._id.toString();
      }
      return String(j);
    })
  );

  const initialJobs: PopulatedJob[] = (allJobsResult.data as JobDocument[])
    .filter((j) => j.status === "completed" && j.escrowStatus === "released" && !reviewedJobIds.has(j._id.toString()))
    .map((j) => {
      const provider = j.providerId as unknown;
      return {
        _id: j._id.toString(),
        title: j.title,
        category: j.category,
        budget: j.budget,
        escrowStatus: j.escrowStatus,
        updatedAt: j.updatedAt instanceof Date ? j.updatedAt.toISOString() : String(j.updatedAt),
        providerId: provider && typeof provider === "object" && "_id" in (provider as object)
          ? {
              _id: (provider as { _id: { toString(): string } })._id.toString(),
              name: (provider as { name: string }).name,
            }
          : null,
      };
    });

  return <ReviewsClient initialJobs={initialJobs} />;
}
