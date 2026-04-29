import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { QueryProvider } from "@/components/providers/QueryProvider";
import AIApprovalDashboard from "@/components/admin/AIApprovalDashboard";

// Skip prerendering since this page requires authentication
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "AI Decision Queue" };

export default async function ApprovalQueuePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <QueryProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Decision Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve AI-generated recommendations for support tickets, job validation, and dispute resolution
          </p>
        </div>

        <Suspense fallback={<div className="text-muted-foreground">Loading dashboard...</div>}>
          <AIApprovalDashboard />
        </Suspense>
      </div>
    </QueryProvider>
  );
}
