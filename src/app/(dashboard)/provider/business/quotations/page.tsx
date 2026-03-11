import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import QuotationsClient from "./_components/QuotationsClient";

export const metadata: Metadata = { title: "Agency Quotations" };

export default async function QuotationsPage() {
  await requireBusinessProvider();
  return <QuotationsClient />;
}
