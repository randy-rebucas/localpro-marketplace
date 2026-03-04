import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import BudgetClient from "./_components/BudgetClient";

export const metadata: Metadata = { title: "Budget Tracking" };

export default async function BudgetPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/");
  return <BudgetClient />;
}
