import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import EarningsClient from "./_components/EarningsClient";

export const metadata: Metadata = { title: "Agency Earnings" };

export default async function AgencyEarningsPage() {
  await requireBusinessProvider();
  return <EarningsClient />;
}
