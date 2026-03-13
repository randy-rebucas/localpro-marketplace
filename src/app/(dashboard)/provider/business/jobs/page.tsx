import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import DispatchClient from "./_components/DispatchClient";

export const metadata: Metadata = { title: "Job Dispatch" };

export default async function DispatchPage() {
  await requireBusinessProvider();
  return <DispatchClient />;
}
