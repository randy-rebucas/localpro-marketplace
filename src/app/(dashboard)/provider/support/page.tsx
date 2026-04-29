import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SupportClient } from "./_components/SupportClient";

export const metadata: Metadata = { title: "Support" };

export default async function ProviderSupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
      <div className="flex items-start justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Support</h2>
          <p className="text-slate-500 text-sm mt-1">Chat with our team for help with jobs, payments, or disputes.</p>
        </div>
      </div>
      <SupportClient userId={user.userId} />
    </div>
  );
}
