import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { connectDB } from "@/lib/db";
import { blogRepository } from "@/repositories";
import { blogCommentRepository } from "@/repositories/blog-comment.repository";
import { generateBlogArticleSchema } from "@/lib/blog-schema";
import BlogContent from "./BlogContent";
import ShareSection from "./ShareSection";
import BlogComments from "./BlogComments";
import AnalyticsTracker from "./AnalyticsTracker";

/* ── helpers (mirrors blog/page.tsx) ────────────────────────── */

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
  "FOR HOMEOWNERS": "text-emerald-600",
  "FOR BUSINESSES": "text-blue-600",
  "FOR PROS":       "text-violet-600",
  "NEWS & UPDATES": "text-amber-600",
  "TIPS & GUIDES":  "text-rose-600",
};

const CARD_GRADIENTS = [
  "from-emerald-100 to-emerald-200",
  "from-blue-100 to-blue-200",
  "from-violet-100 to-violet-200",
  "from-amber-100 to-amber-200",
  "from-rose-100 to-rose-200",
];

function catLabel(cat?: string) {
  if (!cat) return "";
  return CATEGORY_LABEL[cat] ?? cat.toUpperCase();
}

function catColor(label: string) {
  return CATEGORY_COLOR[label] ?? "text-primary";
}

function readTime(content: string) {
  const words = content?.trim().split(/\s+/).length ?? 0;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function formatDate(d: Date | string | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function authorName(author: unknown) {
  if (author && typeof author === "object" && "name" in author)
    return (author as { name: string }).name;
  return "LocalPro Team";
}

function ThumbPlaceholder({ idx }: { idx: number }) {
  const g = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
  return (
    <div className={`h-full w-full bg-gradient-to-br ${g} flex items-center justify-center`}>
      <svg viewBox="0 0 48 48" className="h-6 w-6 text-white/50" fill="currentColor">
        <path d="M4 38l10-14 7 9 10-13L44 38H4z" opacity=".6" />
        <circle cx="15" cy="16" r="4" opacity=".4" />
      </svg>
    </div>
  );
}

/* ── ISR ─────────────────────────────────────────────────────── */

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    await connectDB();
    const result = await blogRepository.findPublished(1, 50);
    return (result.blogs || []).map((b) => ({ slug: b.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  try {
    const blog = await blogRepository.findBySlug(slug);
    if (!blog) return { title: "Article Not Found" };
    return {
      title: `${blog.title} | LocalPro Blog`,
      description: blog.metaDescription || blog.excerpt,
      keywords: blog.keywords?.join(", "),
      openGraph: {
        title: blog.title,
        description: blog.excerpt || blog.content?.substring(0, 150),
        images: blog.featuredImage ? [{ url: blog.featuredImage }] : undefined,
      },
    };
  } catch {
    return { title: "Article Not Found" };
  }
}

/* ── Page ────────────────────────────────────────────────────── */

export default async function BlogArticlePage(props: PageProps) {
  const { slug } = await props.params;

  try {
    const blog = await blogRepository.findBySlug(slug);

    if (!blog) {
      console.warn(`[Blog 404] Slug not found: "${slug}"`);
      notFound();
    }

    if (blog.status !== "published") {
      console.warn(`[Blog 404] Not published: slug="${slug}", status="${blog.status}"`);
      notFound();
    }

    const publishedAt = blog.publishedAt || new Date();
    const blogId = blog._id?.toString() || "";
    const label = catLabel(blog.category);

    const [related, popularResult, prevBlog, nextBlog, commentsResult, commentCount] =
      await Promise.all([
        blogRepository.findRelated(blogId, blog.category, blog.keywords, 3),
        blogRepository.findPublished({ page: 1, limit: 5 }),
        blogRepository.findPrevious(publishedAt, blogId),
        blogRepository.findNext(publishedAt, blogId),
        blogCommentRepository.getApprovedComments(blogId, 1, 20),
        blogCommentRepository.getCommentCount(blogId),
      ]);

    const popularArticles = popularResult.blogs ?? [];

    return (
      <>
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              generateBlogArticleSchema(
                blog,
                process.env.NEXT_PUBLIC_APP_URL || "https://localpro.asia"
              )
            )
              .replace(/</g, "\\u003c")
              .replace(/>/g, "\\u003e")
              .replace(/\//g, "\\u002f"),
          }}
        />

        {/* Breadcrumb */}
        <nav className="bg-slate-50 border-b border-slate-200 py-3">
          <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
            <ol className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
              </li>
              {blog.category && (
                <>
                  <li>/</li>
                  <li>
                    <Link
                      href={`/blog?category=${blog.category}`}
                      className="hover:text-primary transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                </>
              )}
              <li>/</li>
              <li className="text-slate-600 font-medium truncate max-w-[200px] sm:max-w-xs">
                {blog.title}
              </li>
            </ol>
          </div>
        </nav>

        {/* Main layout */}
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex gap-10 items-start">

            {/* ── Article column ── */}
            <article className="flex-1 min-w-0">
              <AnalyticsTracker blogId={blogId} />

              {/* Category label */}
              {label && (
                <p className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${catColor(label)}`}>
                  {label}
                </p>
              )}

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
                {blog.title}
              </h1>

              {/* Excerpt */}
              {blog.excerpt && (
                <p className="text-slate-500 text-base sm:text-lg leading-relaxed mb-6">
                  {blog.excerpt}
                </p>
              )}

              {/* Author + meta row */}
              <div className="flex items-center gap-3 mb-7 pb-6 border-b border-slate-100">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-[11px]">LP</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{authorName(blog.author)}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(publishedAt)} &middot; {readTime(blog.content)}
                  </p>
                </div>
              </div>

              {/* Featured image */}
              {blog.featuredImage && (
                <div className="rounded-xl overflow-hidden mb-8 bg-slate-100 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={blog.featuredImage}
                    alt={blog.title}
                    className="w-full h-64 sm:h-80 object-cover"
                  />
                </div>
              )}

              {/* Article body */}
              <div className="mb-8">
                <BlogContent content={blog.content} />
              </div>

              {/* CTA box */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5 mb-8 flex gap-4 items-start">
                <div className="h-11 w-11 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm mb-1">When in doubt, call a pro.</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Need help with a home service? Browse thousands of verified local professionals on LocalPro.
                  </p>
                  <Link
                    href="/"
                    className="inline-block mt-2.5 text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    Find a Local Pro →
                  </Link>
                </div>
              </div>

              {/* Tags */}
              {blog.keywords && blog.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {blog.keywords.map((k) => (
                    <Link
                      key={k}
                      href={`/blog?search=${encodeURIComponent(k)}`}
                      className="px-3 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      #{k}
                    </Link>
                  ))}
                </div>
              )}

              {/* Share */}
              <ShareSection title={blog.title} slug={blog.slug} />

              {/* Prev / Next navigation */}
              {(prevBlog || nextBlog) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-100">
                  {prevBlog ? (
                    <Link
                      href={`/blog/${prevBlog.slug}`}
                      className="group rounded-xl border border-slate-200 p-4 hover:border-primary/30 hover:shadow-sm transition-all"
                    >
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                        ← Previous Article
                      </p>
                      {prevBlog.featuredImage && (
                        <div className="h-20 w-full rounded-lg overflow-hidden mb-2 bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={prevBlog.featuredImage}
                            alt={prevBlog.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors line-clamp-2">
                        {prevBlog.title}
                      </p>
                    </Link>
                  ) : (
                    <div />
                  )}

                  {nextBlog ? (
                    <Link
                      href={`/blog/${nextBlog.slug}`}
                      className="group rounded-xl border border-slate-200 p-4 hover:border-primary/30 hover:shadow-sm transition-all text-right"
                    >
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                        Next Article →
                      </p>
                      {nextBlog.featuredImage && (
                        <div className="h-20 w-full rounded-lg overflow-hidden mb-2 bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={nextBlog.featuredImage}
                            alt={nextBlog.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors line-clamp-2">
                        {nextBlog.title}
                      </p>
                    </Link>
                  ) : (
                    <div />
                  )}
                </div>
              )}

              {/* Comments */}
              <BlogComments
                blogId={blogId}
                initialComments={
                  commentsResult.comments as unknown as Array<{
                    _id: string;
                    authorName: string;
                    content: string;
                    likes: number;
                    createdAt: string;
                  }>
                }
                totalComments={commentCount}
              />

              {/* Related articles */}
              {related.length > 0 && (
                <div className="mt-12 pt-10 border-t border-slate-100">
                  <h2 className="text-lg font-extrabold text-slate-900 mb-5">You might also like</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {related.map((rb, idx) => {
                      const rl = catLabel(rb.category);
                      return (
                        <Link
                          key={rb._id?.toString() ?? rb.slug}
                          href={`/blog/${rb.slug}`}
                          className="group rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all"
                        >
                          <div className="h-36 bg-slate-100 overflow-hidden">
                            {rb.featuredImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={rb.featuredImage}
                                alt={rb.title}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <ThumbPlaceholder idx={idx} />
                            )}
                          </div>
                          <div className="p-4">
                            {rl && (
                              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${catColor(rl)}`}>
                                {rl}
                              </p>
                            )}
                            <p className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors line-clamp-2">
                              {rb.title}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>

            {/* ── Sidebar ── */}
            <aside className="hidden lg:flex flex-col gap-6 w-[280px] shrink-0 sticky top-[5.5rem]">

              {/* About */}
              <div className="rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-primary" stroke="currentColor" strokeWidth="2">
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
                    {popularArticles.map((pb: any, idx: number) => (
                      <li key={pb._id?.toString() ?? pb.slug}>
                        <Link href={`/blog/${pb.slug}`} className="group flex gap-3 items-start">
                          <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                            {pb.featuredImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={pb.featuredImage}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ThumbPlaceholder idx={idx} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                              {pb.title}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(pb.publishedAt)}</p>
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
        </div>
      </>
    );
  } catch (error) {
    console.error("Error loading article:", error);
    return notFound();
  }
}
