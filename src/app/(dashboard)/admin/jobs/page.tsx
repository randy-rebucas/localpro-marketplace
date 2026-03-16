import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import TourGuide from "@/components/shared/TourGuide";
import AdminJobsClient, { type SerializedJob } from "./AdminJobsClient";
import { Briefcase } from "lucide-react";

export const metadata: Metadata = { title: "Manage Jobs" };

export default async function AdminJobsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const raw = await jobRepository.findPendingValidation();

  const jobs: SerializedJob[] = raw.map((j) => ({
    id:                  String(j._id),
    title:               j.title,
    description:         j.description,
    category:            j.category,
    location:            j.location,
    budget:              j.budget,
    scheduleDate:        j.scheduleDate instanceof Date ? j.scheduleDate.toISOString() : String(j.scheduleDate),
    riskScore:           j.riskScore,
    fraudFlags:          j.fraudFlags ?? [],
    recurringScheduleId: j.recurringScheduleId ?? null,
    createdAt:           j.createdAt instanceof Date ? j.createdAt.toISOString() : String(j.createdAt),
    clientName:          j.clientId.name,
    clientEmail:         j.clientId.email,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30">
          <Briefcase className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Job Validation</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {jobs.length} job{jobs.length !== 1 ? "s" : ""} pending review
          </p>
        </div>
      </div>

      <TourGuide
        pageKey="admin-jobs"
        title="How Job Validation works"
        steps={[
          { icon: "📋", title: "Review pending jobs",  description: "Clients submit jobs that require admin review before becoming visible to providers in the marketplace." },
          { icon: "🚨", title: "Check risk score",      description: "Each job has an automated risk score (Low/Med/High). High-risk jobs need closer scrutiny." },
          { icon: "✅", title: "Approve to publish",    description: "Approving makes the job live and notifies eligible providers. Review all details before approving." },
          { icon: "❌", title: "Reject with reason",    description: "Rejecting sends the client a notification with your reason so they can correct and resubmit." },
        ]}
      />

      <RealtimeRefresher entity="job" />
      <AdminJobsClient jobs={jobs} />
    </div>
  );
}
