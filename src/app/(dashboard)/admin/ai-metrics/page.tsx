import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import AIMetricsDisplay from "@/components/admin/AIMetricsDisplay";

// Skip prerendering since this page requires authentication
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "AI Agent Metrics" };

export default async function AIMetricsPage() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Agent Metrics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Performance metrics for all 11 AI agents - accuracy, auto-approval rates, and risk distribution
        </p>
      </div>

      <Suspense fallback={<div className="text-muted-foreground">Loading metrics...</div>}>
        <AIMetricsDisplay />
      </Suspense>
    </div>
  );
}
