import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import AnalyticsClient from "./_components/AnalyticsClient";

export const metadata: Metadata = { title: "Agency Analytics" };

export default async function AgencyAnalyticsPage() {
  await requireBusinessProvider();
  return <AnalyticsClient />;
}
