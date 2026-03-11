import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import ClientsClient from "./_components/ClientsClient";

export const metadata: Metadata = { title: "Agency Clients" };

export default async function ClientsPage() {
  await requireBusinessProvider();
  return <ClientsClient />;
}
