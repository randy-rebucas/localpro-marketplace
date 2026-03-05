import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import LocationsClient from "./_components/LocationsClient";

export const metadata: Metadata = { title: "Locations" };

export default async function LocationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/");
  return <LocationsClient />;
}
