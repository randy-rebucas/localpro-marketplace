import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/repositories";
import UpgradeAgencyClient from "./_components/UpgradeAgencyClient";

export const metadata: Metadata = { title: "Upgrade to Agency | LocalPro" };

export default async function UpgradeAgencyPage() {
  const token = await getCurrentUser();
  if (!token) redirect("/login");

  const user = await userRepository.findById(token.userId);
  if (!user) redirect("/login");

  // Already upgraded — redirect to dashboard
  if (user.accountType === "business") redirect("/provider/dashboard");

  // Agency staff members cannot create their own agency
  if (user.agencyId) redirect("/provider/dashboard");

  return <UpgradeAgencyClient userName={user.name} />;
}
