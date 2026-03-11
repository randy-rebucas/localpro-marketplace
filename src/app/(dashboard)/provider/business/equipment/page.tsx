import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import EquipmentClient from "./_components/EquipmentClient";

export const metadata: Metadata = { title: "Agency Equipment" };

export default async function EquipmentPage() {
  await requireBusinessProvider();
  return <EquipmentClient />;
}
