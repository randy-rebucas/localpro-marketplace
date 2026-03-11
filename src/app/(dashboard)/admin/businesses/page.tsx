import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import BusinessesClient from "./BusinessesClient";

export const metadata: Metadata = { title: "Businesses | Admin" };

export default async function AdminBusinessesPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return notFound();
  return <BusinessesClient />;
}
