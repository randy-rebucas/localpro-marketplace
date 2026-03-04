import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import MembersClient from "./_components/MembersClient";

export const metadata: Metadata = { title: "Team Members" };

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/");
  return <MembersClient />;
}
