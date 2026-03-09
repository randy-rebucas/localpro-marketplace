import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { jobRepository } from "@/repositories";
import User from "@/models/User";
import PageGuide from "@/components/shared/PageGuide";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import AdminFraudClient from "./AdminFraudClient";

export const metadata: Metadata = { title: "Fraud Monitor" };

interface FlaggedJob {
  _id: { toString(): string };
  title: string;
  category: string;
  budget: number;
  status: string;
  riskScore: number;
  fraudFlags: string[];
  clientId: { _id: { toString(): string }; name: string; email: string };
  createdAt: Date;
}

interface SuspiciousUser {
  _id: { toString(): string };
  name: string;
  email: string;
  role: string;
  kycStatus?: string;
  isVerified?: boolean;
  isSuspended?: boolean;
  flaggedJobCount?: number;
  fraudFlags?: string[];
  createdAt: Date;
}

export default async function AdminFraudPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  await connectDB();

  const [flaggedJobs, suspiciousUsers] = await Promise.all([
    jobRepository.findFlaggedJobs({ riskThreshold: 50, limit: 100 }) as Promise<FlaggedJob[]>,
    User.find({
      $or: [
        { fraudFlags: { $exists: true, $not: { $size: 0 } } },
        { flaggedJobCount: { $gte: 2 } },
      ],
      isDeleted: { $ne: true },
    })
      .select("name email role kycStatus isVerified isSuspended flaggedJobCount fraudFlags createdAt")
      .sort({ flaggedJobCount: -1, createdAt: -1 })
      .limit(100)
      .lean() as Promise<SuspiciousUser[]>,
  ]);

  // Serialize for the client component
  const serializedJobs = flaggedJobs.map((j) => ({
    id:          j._id.toString(),
    title:       j.title,
    category:    j.category,
    budget:      j.budget,
    status:      j.status,
    riskScore:   j.riskScore,
    fraudFlags:  j.fraudFlags ?? [],
    clientId:    j.clientId._id.toString(),
    clientName:  j.clientId.name,
    clientEmail: j.clientId.email,
    createdAt:   new Date(j.createdAt).toISOString(),
  }));

  const serializedUsers = suspiciousUsers.map((u) => ({
    id:             u._id.toString(),
    name:           u.name,
    email:          u.email,
    role:           u.role,
    kycStatus:      u.kycStatus ?? null,
    isVerified:     u.isVerified ?? false,
    isSuspended:    u.isSuspended ?? false,
    flaggedJobCount: u.flaggedJobCount ?? 0,
    fraudFlags:     u.fraudFlags ?? [],
    createdAt:      new Date(u.createdAt).toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageGuide
        pageKey="admin-fraud"
        title="How Fraud Monitoring works"
        steps={[
          { icon: "🔍", title: "Automatic scanning",  description: "Every job submission is scanned for spam keywords, off-platform payment requests, phishing language, and suspicious patterns." },
          { icon: "📊", title: "Risk scoring",        description: "Jobs receive a 0–100 composite risk score combining content signals, budget, category, schedule urgency, and client behaviour." },
          { icon: "🚨", title: "Flagged items",       description: "Jobs with a score ≥ 50 or explicit fraud flags are surfaced here for admin review before they reach providers." },
          { icon: "👤", title: "User risk profiles",  description: "Clients who repeatedly trigger fraud signals accumulate a flagged-job count and are shown here for account review." },
        ]}
      />

      <RealtimeRefresher entity="job" />

      <div>
        <h2 className="text-2xl font-bold text-slate-900">Fraud Monitor</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          {serializedJobs.length} flagged job{serializedJobs.length !== 1 ? "s" : ""} · {serializedUsers.length} suspicious user{serializedUsers.length !== 1 ? "s" : ""}
        </p>
      </div>

      <AdminFraudClient flaggedJobs={serializedJobs} suspiciousUsers={serializedUsers} />
    </div>
  );
}
