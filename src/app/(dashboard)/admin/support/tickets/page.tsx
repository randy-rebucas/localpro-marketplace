import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminTicketQueue from "./AdminTicketQueue";

export default async function AdminTicketsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) redirect("/login");

  return <AdminTicketQueue />;
}
