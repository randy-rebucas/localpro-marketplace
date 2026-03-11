import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/repositories";
import UpgradeBusinessClient from "./_components/UpgradeBusinessClient";

export const metadata: Metadata = { title: "Upgrade to Business | LocalPro" };

export default async function UpgradeBusinessPage() {
  const token = await getCurrentUser();
  if (!token) redirect("/login");

  const user = await userRepository.findById(token.userId);
  if (!user) redirect("/login");

  // Already a business account — redirect to hub
  if (user.accountType === "business") redirect("/client/business");

  return <UpgradeBusinessClient userName={user.name} />;
}
