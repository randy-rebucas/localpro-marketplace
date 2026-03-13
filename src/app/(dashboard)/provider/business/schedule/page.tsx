import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import ScheduleClient from "./_components/ScheduleClient";

export const metadata: Metadata = { title: "Agency Schedule" };

export default async function SchedulePage() {
  await requireBusinessProvider();
  return <ScheduleClient />;
}
