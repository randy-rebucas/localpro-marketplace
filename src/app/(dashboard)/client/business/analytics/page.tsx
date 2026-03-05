import type { Metadata } from "next";
import { requireBusinessClient } from "@/lib/requireBusinessClient";
import AnalyticsClient from "./_components/AnalyticsClient";

export const metadata: Metadata = { title: "Business Analytics" };

export default async function AnalyticsPage() {
  await requireBusinessClient();
  return <AnalyticsClient />;
}
