import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getArticlesForFolder } from "@/lib/knowledge";
import KnowledgeBase from "@/components/shared/KnowledgeBase";
import TourGuide from "@/components/shared/TourGuide";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "Knowledge Base" };

export default async function ProviderKnowledgePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const articles = getArticlesForFolder("provider").map((a) => ({
    _id:     a.slug,
    title:   a.title,
    excerpt: a.excerpt,
    group:   a.group,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <TourGuide
        pageKey="provider-knowledge"
        title="Knowledge Base tips"
        steps={[
          { icon: "📚", title: "Browse by topic", description: "Articles are organised by topic — getting started, finding work, earnings, and more." },
          { icon: "🔍", title: "Search articles", description: "Use the search bar to quickly find guides by keyword." },
          { icon: "💡", title: "Grow your business", description: "Read tips on winning more jobs, managing your schedule, and improving your profile." },
          { icon: "🎧", title: "Still need help?", description: "Can't find your answer? Contact our support team from the Support page." },
        ]}
      />
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 rounded-xl">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Knowledge Base</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Guides and answers for providers · {articles.length} articles
          </p>
        </div>
      </div>
      <KnowledgeBase articles={articles} basePath="/provider/knowledge" />
    </div>
  );
}
