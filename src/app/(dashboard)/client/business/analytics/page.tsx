import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AnalyticsClient from "./_components/AnalyticsClient";

export const metadata: Metadata = { title: "Business Analytics" };

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/");
  return <AnalyticsClient />;
}
