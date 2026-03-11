import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import ServicesClient from "./_components/ServicesClient";

export const metadata: Metadata = { title: "Agency Services" };

export default async function ServicesPage() {
  await requireBusinessProvider();
  return <ServicesClient />;
}
