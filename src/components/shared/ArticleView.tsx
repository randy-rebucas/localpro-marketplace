import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

interface Article {
  _id: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  group: string;
  updatedAt: string;
}

interface Props {
  article: Article;
  backHref: string;
  backLabel?: string;
}

export default function ArticleView({ article, backHref, backLabel = "Knowledge Base" }: Props) {
  const updated = new Date(article.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {/* Article card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
            {article.group}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 leading-snug">{article.title}</h1>
          <p className="text-slate-500 text-sm mt-2">{article.excerpt}</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            Updated {updated}
          </div>
        </div>

        {/* Body — rendered HTML from marked */}
        <div className="px-8 py-7">
          <div
            className="prose prose-slate prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: article.contentHtml }}
          />
        </div>
      </div>
    </div>
  );
}
