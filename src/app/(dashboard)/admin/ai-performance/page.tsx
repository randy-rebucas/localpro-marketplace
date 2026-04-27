import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { QueryProvider } from "@/components/providers/QueryProvider";
import AIPerformanceMetrics from "@/components/admin/AIPerformanceMetrics";

// Skip prerendering since this page requires authentication
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "AI Performance Metrics" };

export default async function AIPerformancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <QueryProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Performance Metrics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor accuracy, override rates, and performance across all AI agents
          </p>
        </div>

        <Suspense fallback={<div className="text-muted-foreground">Loading metrics...</div>}>
          <AIPerformanceMetrics />
        </Suspense>
      </div>
    </QueryProvider>
  );
}
