import type { Metadata } from "next";
import { requireBusinessClient } from "@/lib/requireBusinessClient";
import DisputesClient from "./_components/DisputesClient";

export const metadata: Metadata = { title: "Dispute Resolution Center" };

export default async function DisputesPage() {
  await requireBusinessClient();
  return <DisputesClient />;
}
