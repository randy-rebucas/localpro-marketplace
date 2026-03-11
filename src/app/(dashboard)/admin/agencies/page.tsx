import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import AgenciesClient from "./AgenciesClient";

export const metadata: Metadata = { title: "Agencies | Admin" };

export default async function AdminAgenciesPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return notFound();
  return <AgenciesClient />;
}
