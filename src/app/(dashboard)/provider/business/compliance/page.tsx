import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import ComplianceClient from "./_components/ComplianceClient";

export const metadata: Metadata = { title: "Compliance & Legal" };

export default async function CompliancePage() {
  await requireBusinessProvider();
  return <ComplianceClient />;
}
