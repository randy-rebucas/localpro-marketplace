import type { Metadata } from "next";
import { requireBusinessClient } from "@/lib/requireBusinessClient";
import MembersClient from "./_components/MembersClient";

export const metadata: Metadata = { title: "Team Members" };

export default async function MembersPage() {
  await requireBusinessClient();
  return <MembersClient />;
}
