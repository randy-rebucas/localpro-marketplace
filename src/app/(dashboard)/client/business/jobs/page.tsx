import type { Metadata } from "next";
import { requireBusinessClient } from "@/lib/requireBusinessClient";
import JobsClient from "./_components/JobsClient";

export const metadata: Metadata = { title: "Job Management" };

export default async function BusinessJobsPage() {
  await requireBusinessClient();
  return <JobsClient />;
}
