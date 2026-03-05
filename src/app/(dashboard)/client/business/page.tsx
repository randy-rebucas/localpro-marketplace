import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import BusinessHubClient from "./_components/BusinessHubClient";

export const metadata: Metadata = { title: "Business Hub" };

export default async function BusinessHubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/");

  return (
    <div className="space-y-2">
      <BusinessHubClient />
    </div>
  );
}
