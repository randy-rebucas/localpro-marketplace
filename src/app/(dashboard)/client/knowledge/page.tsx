import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getArticlesForFolder } from "@/lib/knowledge";
import KnowledgeBase from "@/components/shared/KnowledgeBase";
import PageGuide from "@/components/shared/PageGuide";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "Knowledge Base" };

export default async function ClientKnowledgePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const articles = getArticlesForFolder("client").map((a) => ({
    _id:     a.slug,
    title:   a.title,
    excerpt: a.excerpt,
    group:   a.group,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageGuide
        pageKey="client-knowledge"
        title="Knowledge Base tips"
        steps={[
          { icon: "📚", title: "Browse by topic", description: "Articles are grouped by topic so you can quickly find what you need." },
          { icon: "🔍", title: "Search articles", description: "Use the search bar to find articles by keyword across all topics." },
          { icon: "💡", title: "Learn the platform", description: "Find step-by-step guides for posting jobs, managing escrow, and working with providers." },
          { icon: "🎧", title: "Still need help?", description: "Can't find your answer here? Head to Support to chat with our team directly." },
        ]}
      />
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 rounded-xl">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Knowledge Base</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Guides and answers for clients · {articles.length} articles
          </p>
        </div>
      </div>
      <KnowledgeBase articles={articles} basePath="/client/knowledge" />
    </div>
  );
}
