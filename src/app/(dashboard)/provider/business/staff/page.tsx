import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import StaffClient from "./_components/StaffClient";

export const metadata: Metadata = { title: "Staff Management" };

export default async function StaffPage() {
  await requireBusinessProvider();
  return <StaffClient />;
}
