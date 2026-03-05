import type { Metadata } from "next";
import { requireBusinessClient } from "@/lib/requireBusinessClient";
import BudgetClient from "./_components/BudgetClient";

export const metadata: Metadata = { title: "Budget Tracking" };

export default async function BudgetPage() {
  await requireBusinessClient();
  return <BudgetClient />;
}
