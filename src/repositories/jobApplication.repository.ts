import JobApplication from "@/models/JobApplication";
import type { JobApplicationDocument } from "@/models/JobApplication";
import { BaseRepository } from "./base.repository";

export class JobApplicationRepository extends BaseRepository<JobApplicationDocument> {
  constructor() {
    super(JobApplication);
  }

  /** All applications for a job, newest first, with applicant details populated. */
  async findByJob(jobId: string): Promise<(JobApplicationDocument & {
    applicantId: { _id: string; name: string; email: string; avatar?: string | null; isVerified?: boolean };
  })[]> {
    await this.connect();
    return JobApplication.find({ jobId })
      .populate("applicantId", "name email avatar isVerified")
      .sort({ createdAt: -1 })
      .lean() as never;
  }

  /** Check if a provider has already applied to a job. */
  async findByApplicantAndJob(
    applicantId: string,
    jobId: string
  ): Promise<JobApplicationDocument | null> {
    await this.connect();
    return JobApplication.findOne({ applicantId, jobId }).lean() as unknown as JobApplicationDocument | null;
  }

  /** All applications by a provider across all jobs. */
  async findByApplicant(applicantId: string): Promise<JobApplicationDocument[]> {
    await this.connect();
    return JobApplication.find({ applicantId })
      .select("jobId status createdAt")
      .sort({ createdAt: -1 })
      .lean() as unknown as JobApplicationDocument[];
  }

  /** Update application status (pending → shortlisted / rejected / hired). */
  async updateStatus(
    id: string,
    status: "pending" | "shortlisted" | "rejected" | "hired"
  ): Promise<JobApplicationDocument | null> {
    await this.connect();
    return JobApplication.findByIdAndUpdate(id, { status }, { new: true }).lean() as unknown as JobApplicationDocument | null;
  }

  /** Count applications for a job. */
  async countByJob(jobId: string): Promise<number> {
    await this.connect();
    return JobApplication.countDocuments({ jobId });
  }
}

export const jobApplicationRepository = new JobApplicationRepository();
