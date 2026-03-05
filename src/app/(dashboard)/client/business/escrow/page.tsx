import type { Metadata } from "next";
import { requireBusinessClient } from "@/lib/requireBusinessClient";
import EscrowClient from "./_components/EscrowClient";

export const metadata: Metadata = { title: "Escrow & Payments" };

export default async function EscrowPage() {
  await requireBusinessClient();
  return <EscrowClient />;
}
