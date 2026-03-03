import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RewardsSkeleton } from "./_components/skeletons";
import RewardsContent from "./_components/RewardsContent";

export const metadata: Metadata = { title: "Rewards" };

export default async function RewardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <Suspense fallback={<RewardsSkeleton />}>
      <RewardsContent userId={user.userId} />
    </Suspense>
  );
}

