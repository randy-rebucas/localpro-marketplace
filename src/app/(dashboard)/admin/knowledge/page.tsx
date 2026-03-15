import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getAllArticles } from "@/lib/knowledge";
import KnowledgeAdminView from "./KnowledgeAdminView";
import PageGuide from "@/components/shared/PageGuide";
import { BookOpen } from "lucide-react";

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

  const clientCount   = articles.filter((a) => a.folder === "client").length;
  const providerCount = articles.filter((a) => a.folder === "provider").length;
  const businessCount = articles.filter((a) => a.folder === "business").length;
  const agencyCount   = articles.filter((a) => a.folder === "agency").length;
  const pesoCount     = articles.filter((a) => a.folder === "peso").length;

  return (
    <div className="space-y-5">
      <PageGuide
        pageKey="admin-knowledge"
        title="How the Knowledge Base works"
        steps={[
          { icon: "📝", title: "Create articles", description: "Click 'Add Article', choose the audience (client, provider, business, agency, or peso), write in Markdown, and save. The .md file is created automatically." },
          { icon: "✏️", title: "Edit articles", description: "Click the pencil icon on any article. Changes are saved directly to the .md file on disk." },
          { icon: "🗂️", title: "Groups", description: "Assign a group name to each article (e.g. 'Getting Started'). Articles with the same group appear together in the portal." },
          { icon: "🎯", title: "Audience", description: "Choose an audience to control which portal sees the article: client, provider, business, agency, or peso." },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">Knowledge Base</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Markdown files in{" "}
              <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono">content/knowledge/</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline font-semibold text-slate-700 dark:text-slate-200">{articles.length}</span>
          <span className="hidden sm:inline">articles</span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600">·</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold">{clientCount} client</span>
          <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-semibold">{providerCount} provider</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold">{businessCount} business</span>
          <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-semibold">{agencyCount} agency</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold">{pesoCount} peso</span>
        </div>
      </div>

      <KnowledgeAdminView initialArticles={articles} />
    </div>
  );
}
