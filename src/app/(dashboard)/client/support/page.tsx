import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SupportClient from "./_components/SupportClient";

export default async function ClientSupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <SupportClient userId={user.userId} />;
}

