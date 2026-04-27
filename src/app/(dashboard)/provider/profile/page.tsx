import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import ProfileClient from "./_components/ProfileClient";

export const metadata: Metadata = { title: "My Profile | LocalPro" };

export default async function ProviderProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await providerProfileRepository.findByUserId(user.userId);

  return (
    <ProfileClient
      initialProfile={JSON.parse(JSON.stringify(profile ?? {}))}
    />
  );
}
