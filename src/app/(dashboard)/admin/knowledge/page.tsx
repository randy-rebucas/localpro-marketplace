import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getAllArticles } from "@/lib/knowledge";
import KnowledgeAdminView from "./KnowledgeAdminView";
import PageGuide from "@/components/shared/PageGuide";

export const metadata: Metadata = { title: "Knowledge Base" };

export default async function AdminKnowledgePage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const raw = getAllArticles();
  // Attach composite id used by the CRUD API
  const articles = raw.map((a) => ({
    id:        `${a.folder}__${a.slug}`,
    slug:      a.slug,
    folder:    a.folder,
    title:     a.title,
    excerpt:   a.excerpt,
    content:   a.content,
    group:     a.group,
    order:     a.order,
    audience:  a.audience,
    updatedAt: a.updatedAt,
  }));

  return (
    <div className="space-y-6">
      <PageGuide
        pageKey="admin-knowledge"
        title="How the Knowledge Base works"
        steps={[
          { icon: "📝", title: "Create articles", description: "Click 'Add Article', choose the audience (client or provider), write in Markdown, and save. The .md file is created automatically." },
          { icon: "✏️", title: "Edit articles", description: "Click the pencil icon on any article. Changes are saved directly to the .md file on disk." },
          { icon: "🗂️", title: "Groups", description: "Assign a group name to each article (e.g. 'Getting Started'). Articles with the same group appear together in the portal." },
          { icon: "🎯", title: "Audience", description: "Choose 'client' or 'provider' to control which portal sees the article." },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Knowledge Base</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Articles stored as Markdown files in{" "}
            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">content/knowledge/</code>
          </p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p className="font-medium text-slate-700">{articles.length} articles</p>
          <p className="text-xs">{articles.filter((a) => a.folder === "client").length} client · {articles.filter((a) => a.folder === "provider").length} provider</p>
        </div>
      </div>
      <KnowledgeAdminView initialArticles={articles} />
    </div>
  );
}
