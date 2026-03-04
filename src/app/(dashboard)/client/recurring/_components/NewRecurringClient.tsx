"use client";
import { useRouter } from "next/navigation";
import { CreateRecurringForm } from "./CreateRecurringForm";

export function NewRecurringClient() {
  const router = useRouter();
  return (
    <CreateRecurringForm
      onCreated={() => router.push("/client/recurring")}
      onCancel={() => router.push("/client/recurring")}
    />
  );
}
