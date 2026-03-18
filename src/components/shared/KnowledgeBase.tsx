"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, ChevronRight, BookOpen } from "lucide-react";

export interface KnowledgeArticleSummary {
  _id: string;
  title: string;
  excerpt: string;
  group: string;
}

interface Props {
  articles: KnowledgeArticleSummary[];
  basePath: string; // "/client/knowledge" | "/provider/knowledge"
}

export default function KnowledgeBase({ articles, basePath }: Props) {
  const t = useTranslations("knowledgeBase");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return articles;
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q)
    );
  }, [query, articles]);

  // Group articles by their group heading
  const grouped = useMemo(() => {
    const map = new Map<string, KnowledgeArticleSummary[]>();
    for (const a of filtered) {
      const list = map.get(a.group) ?? [];
      list.push(a);
      map.set(a.group, list);
    }
    return map;
  }, [filtered]);

  const isSearching = query.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <BookOpen className="h-10 w-10 opacity-20" />
          <p className="text-sm">
            {isSearching ? t("noResults", { query }) : t("noArticles")}
          </p>
        </div>
      )}

      {/* Results */}
      {isSearching && filtered.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider px-1">
            {filtered.length !== 1 ? t("resultCountPlural", { n: filtered.length }) : t("resultCount", { n: filtered.length })}
          </p>
          {filtered.map((a) => (
            <ArticleCard key={a._id} article={a} basePath={basePath} showGroup />
          ))}
        </div>
      ) : (
        Array.from(grouped.entries()).map(([group, items]) => (
          <section key={group}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 px-1">
              {group}
            </h3>
            <div className="space-y-1.5">
              {items.map((a) => (
                <ArticleCard key={a._id} article={a} basePath={basePath} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function ArticleCard({
  article,
  basePath,
  showGroup,
}: {
  article: KnowledgeArticleSummary;
  basePath: string;
  showGroup?: boolean;
}) {
  return (
    <Link
      href={`${basePath}/${article._id}`}
      className="group flex items-start gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
        <BookOpen className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        {showGroup && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {article.group}
          </span>
        )}
        <p className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors leading-snug">
          {article.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{article.excerpt}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary flex-shrink-0 mt-1 transition-colors" />
    </Link>
  );
}
