import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getArticlesForFolder } from "@/lib/knowledge";
import KnowledgeBase from "@/components/shared/KnowledgeBase";
import TourGuide from "@/components/shared/TourGuide";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "Knowledge Base" };

export default async function PesoKnowledgePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const articles = getArticlesForFolder("peso").map((a) => ({
    _id:     a.slug,
    title:   a.title,
    excerpt: a.excerpt,
    group:   a.group,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <TourGuide
        pageKey="peso-knowledge"
        title="Knowledge Base tips"
        steps={[
          { icon: "📚", title: "Browse by topic", description: "Articles are organised by topic — onboarding workers, posting jobs, verifying providers, and generating reports." },
          { icon: "🔍", title: "Search articles", description: "Use the search bar to quickly find guides by keyword." },
          { icon: "🏛️", title: "PESO-specific guides", description: "All articles are tailored to PESO officers — covering referral flows, bulk onboarding, certifications, and DOLE reporting." },
          { icon: "🎧", title: "Still need help?", description: "Can't find your answer? Contact PESO support at peso@localpro.ph or use the Support button in the portal." },
        ]}
      />
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-500/10 rounded-xl">
          <BookOpen className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Knowledge Base</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Guides and answers for PESO officers · {articles.length} articles
          </p>
        </div>
      </div>
      <KnowledgeBase articles={articles} basePath="/peso/knowledge" />
    </div>
  );
}
