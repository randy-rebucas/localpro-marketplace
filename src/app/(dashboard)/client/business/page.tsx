import type { Metadata } from "next";
import { requireBusinessClient } from "@/lib/requireBusinessClient";
import BusinessHubClient from "./_components/BusinessHubClient";

export const metadata: Metadata = { title: "Business Hub" };

export default async function BusinessHubPage() {
  await requireBusinessClient();
  return <BusinessHubClient />;
}
