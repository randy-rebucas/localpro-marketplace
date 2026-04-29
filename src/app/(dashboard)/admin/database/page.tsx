import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DatabaseClient from "./DatabaseClient";

export const metadata: Metadata = { title: "Database Management" };

export default async function DatabasePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");

  const resetEnabled = process.env.DB_RESET_ENABLED === "true";

  return <DatabaseClient resetEnabled={resetEnabled} />;
}
