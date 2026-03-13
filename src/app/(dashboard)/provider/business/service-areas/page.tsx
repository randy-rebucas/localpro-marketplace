import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import ServiceAreasClient from "./_components/ServiceAreasClient";

export const metadata: Metadata = { title: "Service Areas" };

export default async function ServiceAreasPage() {
  await requireBusinessProvider();
  return <ServiceAreasClient />;
}
