import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import DatabaseClient from "./DatabaseClient";

export const metadata: Metadata = { title: "Database Management" };

export default async function DatabasePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;

  const resetEnabled = process.env.DB_RESET_ENABLED === "true";

  return <DatabaseClient resetEnabled={resetEnabled} />;
}
