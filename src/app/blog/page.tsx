import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { blogRepository } from "@/repositories";

export const metadata: Metadata = {
  title: "Blog | LocalPro",
  description: "Practical tips, expert advice, and stories to help you make the most of local services.",
};

/* ── helpers ──────────────────────────────────────────────── */

const CATEGORIES = [
  { value: "",                label: "All Topics"      },
  { value: "for-homeowners",  label: "For Homeowners"  },
  { value: "for-businesses",  label: "For Businesses"  },
  { value: "for-pros",        label: "For Pros"        },
  { value: "news-updates",    label: "News & Updates"  },
  { value: "tips-guides",     label: "Tips & Guides"   },
];

const CATEGORY_LABEL: Record<string, string> = {
  news:               "NEWS & UPDATES",
  tutorial:           "TIPS & GUIDES",
  "tips-tricks":      "TIPS & GUIDES",
  "service-update":   "FOR BUSINESSES",
  "industry-insights":"FOR PROS",
  announcement:       "NEWS & UPDATES",
  "for-homeowners":   "FOR HOMEOWNERS",
  "for-businesses":   "FOR BUSINESSES",
  "for-pros":         "FOR PROS",
  "news-updates":     "NEWS & UPDATES",
  "tips-guides":      "TIPS & GUIDES",
};

const CATEGORY_COLOR: Record<string, string> = {
  "FOR HOMEOWNERS":  "text-emerald-700",
  "FOR BUSINESSES":  "text-blue-700",
  "FOR PROS":        "text-violet-700",
  "NEWS & UPDATES":  "text-amber-700",
  "TIPS & GUIDES":   "text-rose-700",
};

function categoryLabel(cat?: string) {
  if (!cat) return "GENERAL";
  return CATEGORY_LABEL[cat] ?? cat.toUpperCase();
}

function categoryColor(label: string) {
  return CATEGORY_COLOR[label] ?? "text-primary";
}

function readTime(content: string) {
  const words = content?.trim().split(/\s+/).length ?? 0;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function excerpt(content: string, max = 140) {
  const plain = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_`>\[\]!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? plain.slice(0, max) + "…" : plain;
}

function authorName(author: unknown) {
  if (author && typeof author === "object" && "name" in author) return (author as { name: string }).name;
  return "LocalPro Team";
}

/* ── article card image placeholder ──────────────────────── */
const CARD_GRADIENTS = [
  "from-emerald-100 to-emerald-200",
  "from-blue-100 to-blue-200",
  "from-violet-100 to-violet-200",
  "from-amber-100 to-amber-200",
  "from-rose-100 to-rose-200",
  "from-cyan-100 to-cyan-200",
];

function PlaceholderImg({ idx, className }: { idx: number; className?: string }) {
  const g = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
  return (
    <div className={`bg-gradient-to-br ${g} flex items-center justify-center ${className ?? ""}`}>
      <svg viewBox="0 0 48 48" className="h-10 w-10 text-white/60" fill="currentColor">
        <path d="M4 38l10-14 7 9 10-13L44 38H4z" opacity=".5" />
        <circle cx="15" cy="16" r="4" opacity=".4" />
      </svg>
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────── */

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function BlogPage({ searchParams }: { searchParams: SP }) {
  const params   = await searchParams;
  const rawPage  = typeof params.page     === "string" ? params.page     : "1";
  const search   = typeof params.search   === "string" ? params.search   : "";
  const category = typeof params.category === "string" ? params.category : "";

  const currentPage = Math.max(1, parseInt(rawPage) || 1);
  const PER_PAGE    = 9;

  let blogs: any[]  = [];
  let total         = 0;
  let totalPages    = 1;

  try {
    const result = await blogRepository.findPublished({
      page: currentPage,
      limit: PER_PAGE,
      search,
      category,
    });
    blogs      = result.blogs ?? [];
    total      = result.total ?? 0;
    totalPages = Math.ceil(total / PER_PAGE) || 1;
  } catch {
    /* silently fall through to empty state */
  }

  const featured       = currentPage === 1 && blogs.length > 0 ? blogs[0] : null;
  const gridBlogs      = featured ? blogs.slice(1) : blogs;
  const popularArticles = blogs.slice(0, 5);

  const buildHref = (p: number, q = search, c = category) => {
    const sp = new URLSearchParams();
    if (p > 1)  sp.set("page", String(p));
    if (q)      sp.set("search", q);
    if (c)      sp.set("category", c);
    const s = sp.toString();
    return `/blog${s ? `?${s}` : ""}`;
  };

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="bg-[#0c2340] overflow-hidden">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 min-h-[280px]">
          {/* Left */}
          <div className="py-12 lg:py-16 flex flex-col justify-center">
            <p className="text-[#22c55e] text-xs font-bold uppercase tracking-widest mb-3">Blog</p>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-white leading-tight mb-3">
              Tips, Insights, and
              <br />
              Inspiration for You
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-sm leading-relaxed">
              Practical tips, expert advice, and stories to help you make the most of local services.
            </p>
          </div>

          {/* Right — hero stock image */}
          <div className="hidden lg:block relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=80"
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-[#0c2340]/30" />
          </div>
        </div>
      </section>

      {/* ── Search + Category tabs ────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white sticky top-[5rem] z-30">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Search */}
          <form method="get" action="/blog" className="relative shrink-0 w-full sm:w-56">
            {category && <input type="hidden" name="category" value={category} />}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Search articles..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary bg-slate-50"
            />
          </form>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const active = cat.value === category;
              return (
                <Link
                  key={cat.value}
                  href={buildHref(1, search, cat.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? "bg-primary text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-primary/50 hover:text-primary"
                  }`}
                >
                  {cat.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {blogs.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-2xl font-bold text-slate-800 mb-2">No articles found</p>
            <p className="text-slate-500 text-sm">
              {search ? `No results for "${search}" — try a different term.` : "Check back soon for new content."}
            </p>
            <Link href="/blog" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
              View all articles
            </Link>
          </div>
        ) : (
          <div className="flex gap-8 items-start">
            {/* ── Articles column ── */}
            <div className="flex-1 min-w-0">

              {/* Featured */}
              {featured && (
                <Link href={`/blog/${featured.slug}`} className="group block mb-8">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow grid grid-cols-1 md:grid-cols-2">
                    {/* Image */}
                    <div className="relative h-56 md:h-auto overflow-hidden bg-slate-100">
                      {featured.featuredImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={featured.featuredImage} alt={featured.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <PlaceholderImg idx={0} className="h-full w-full" />
                      )}
                      <span className="absolute top-3 left-3 bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded tracking-widest uppercase">
                        Featured
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-7 flex flex-col justify-center bg-white">
                      {featured.category && (
                        <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${categoryColor(categoryLabel(featured.category))}`}>
                          {categoryLabel(featured.category)}
                        </p>
                      )}
                      <h2 className="text-2xl font-extrabold text-slate-900 leading-snug mb-3 group-hover:text-primary transition-colors line-clamp-3">
                        {featured.title}
                      </h2>
                      <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-5">
                        {featured.excerpt || excerpt(featured.content ?? "")}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-primary font-bold text-[10px]">LP</span>
                        </div>
                        <span className="font-medium text-slate-600">{authorName(featured.author)}</span>
                        <span>•</span>
                        <span>{formatDate(featured.publishedAt)}</span>
                        <span>•</span>
                        <span>{readTime(featured.content ?? "")}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Article grid */}
              {gridBlogs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {gridBlogs.map((blog, idx) => {
                    const label = categoryLabel(blog.category);
                    return (
                      <Link key={blog._id?.toString() ?? blog.slug} href={`/blog/${blog.slug}`} className="group flex flex-col rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all bg-white">
                        {/* Card image */}
                        <div className="relative h-44 overflow-hidden">
                          {blog.featuredImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={blog.featuredImage} alt={blog.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <PlaceholderImg idx={idx + 1} className="h-full w-full" />
                          )}
                        </div>

                        {/* Card body */}
                        <div className="p-4 flex flex-col flex-1">
                          {blog.category && (
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${categoryColor(label)}`}>
                              {label}
                            </p>
                          )}
                          <h3 className="text-sm font-bold text-slate-900 leading-snug mb-2 line-clamp-3 group-hover:text-primary transition-colors flex-1">
                            {blog.title}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                            {blog.excerpt || excerpt(blog.content ?? "", 100)}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-auto pt-3 border-t border-slate-100">
                            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                              <span className="text-primary font-bold text-[8px]">LP</span>
                            </div>
                            <span className="font-medium text-slate-500">{authorName(blog.author)}</span>
                            <span>•</span>
                            <span>{formatDate(blog.publishedAt)}</span>
                            <span>•</span>
                            <span>{readTime(blog.content ?? "")}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-1.5 flex-wrap">
                  {currentPage > 1 && (
                    <Link href={buildHref(currentPage - 1)} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                      ‹ Prev
                    </Link>
                  )}
                  {(() => {
                    const pages: (number | "…")[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1, 2, 3);
                      if (currentPage > 4) pages.push("…");
                      if (currentPage > 3 && currentPage < totalPages - 2) pages.push(currentPage);
                      if (currentPage < totalPages - 3) pages.push("…");
                      pages.push(totalPages);
                    }
                    return pages.map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-2 py-2 text-slate-400 text-sm select-none">…</span>
                      ) : (
                        <Link
                          key={p}
                          href={buildHref(p as number)}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                            currentPage === p
                              ? "bg-primary text-white shadow-sm"
                              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </Link>
                      )
                    );
                  })()}
                  {currentPage < totalPages && (
                    <Link href={buildHref(currentPage + 1)} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                      Next ›
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* ── Sidebar ── */}
            <aside className="hidden lg:flex flex-col gap-6 w-[290px] shrink-0">

              {/* About */}
              <div className="rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-primary" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" strokeLinecap="round" />
                      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">About LocalPro Blog</h2>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  We share helpful tips, inspiring stories, and important updates to help you make informed decisions and get the most out of LocalPro.
                </p>
              </div>

              {/* Popular Articles */}
              {popularArticles.length > 0 && (
                <div className="rounded-xl border border-slate-200 p-5">
                  <h2 className="text-sm font-bold text-slate-900 mb-4">Popular Articles</h2>
                  <ul className="space-y-4">
                    {popularArticles.map((blog, idx) => (
                      <li key={blog._id?.toString() ?? blog.slug}>
                        <Link href={`/blog/${blog.slug}`} className="group flex gap-3 items-start">
                          <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0">
                            {blog.featuredImage ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={blog.featuredImage} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <PlaceholderImg idx={idx} className="h-full w-full" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                              {blog.title}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(blog.publishedAt)}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Newsletter */}
              <div className="rounded-xl bg-[#0c2340] p-5">
                <h2 className="text-sm font-bold text-white mb-1">Stay Updated</h2>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Subscribe to get the latest tips, stories, and updates straight to your inbox.
                </p>
                <form action="/api/newsletter" method="post" className="space-y-2">
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email address"
                    required
                    className="w-full px-3 py-2.5 rounded-lg text-xs bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-600 text-white text-xs font-bold transition-colors"
                  >
                    Subscribe
                  </button>
                </form>
                <p className="text-[10px] text-slate-400 mt-2 text-center">No spam. Unsubscribe anytime.</p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
