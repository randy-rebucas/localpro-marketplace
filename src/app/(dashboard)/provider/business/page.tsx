import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import BusinessHubClient from "./_components/BusinessHubClient";

export const metadata: Metadata = { title: "Agency Hub" };

export default async function AgencyHubPage() {
  await requireBusinessProvider();
  return <div className="space-y-2"><BusinessHubClient /></div>;
}
