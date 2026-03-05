import type { Metadata } from "next";
import { requireBusinessClient } from "@/lib/requireBusinessClient";
import LocationsClient from "./_components/LocationsClient";

export const metadata: Metadata = { title: "Locations" };

export default async function LocationsPage() {
  await requireBusinessClient();
  return <LocationsClient />;
}
