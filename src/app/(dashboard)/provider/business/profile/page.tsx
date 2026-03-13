import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import CompanyProfileClient from "./_components/CompanyProfileClient";

export const metadata: Metadata = { title: "Company Profile" };

export default async function CompanyProfilePage() {
  await requireBusinessProvider();
  return <CompanyProfileClient />;
}
