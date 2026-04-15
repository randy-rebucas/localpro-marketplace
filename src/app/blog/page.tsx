import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Calendar, User, ArrowRight, Search, BookOpen, Tag } from "lucide-react";
import { blogRepository } from "@/repositories";
import { generateBlogCollectionSchema } from "@/lib/blog-schema";

export const metadata: Metadata = {
  title: "Blog | LocalPro",
  description: "Insights, updates, and stories from the LocalPro community",
};

interface SearchParams {
  page?: string;
  search?: string;
  category?: string;
}

const BLOG_CATEGORIES = [
  { value: "news", label: "News", icon: "📰" },
  { value: "tutorial", label: "Tutorials", icon: "📚" },
  { value: "tips-tricks", label: "Tips & Tricks", icon: "✨" },
  { value: "service-update", label: "Updates", icon: "🚀" },
  { value: "industry-insights", label: "Insights", icon: "💡" },
  { value: "announcement", label: "Announcements", icon: "📣" },
];

/**
 * Extract plain text preview from markdown content
 * Strips markdown syntax to show readable text on listing page
 */
function getContentPreview(content: string, maxLength: number = 150): string {
  if (!content) return "";
  
  // Remove markdown syntax
  let text = content
    // Remove headings (# ## ### etc)
    .replace(/^#+\s+/gm, "")
    // Remove bold (**text** or __text__)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    // Remove italic (*text* or _text_)
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // Remove inline code (`text`)
    .replace(/`(.+?)`/g, "$1")
    // Remove code blocks (```...```)
    .replace(/```[\s\S]*?```/g, "")
    // Remove links [text](url)
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    // Remove images ![alt](url)
    .replace(/!\[(.+?)\]\(.+?\)/g, "$1")
    // Remove blockquotes (> text)
    .replace(/^\s*>\s+/gm, "")
    // Remove lists (* - +)
    .replace(/^\s*[-*+]\s+/gm, "")
    // Remove horizontal rules
    .replace(/^\s*[-_*]{3,}\s*$/gm, "")
    // Remove extra whitespace
    .replace(/\n\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  // Truncate and add ellipsis if needed
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + "...";
  }
  
  return text;
}

/**
 * Public Blog Listing Page
 * 
 * Displays published blogs with pagination and search
 */
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page = "1", search = "", category = "" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page) || 1);
  const limit = 12;

  try {
    // Fetch published blogs
    const result = await blogRepository.findPublished(currentPage, limit, search);
    const blogs = result.blogs || [];
    const total = result.total || 0;
    const totalPages = Math.ceil(total / limit);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* JSON-LD Schema Markup for Blog Collection */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              generateBlogCollectionSchema(blogs, category || undefined, process.env.NEXT_PUBLIC_APP_URL || "https://localpro.com")
            ),
          }}
        />
        {/* Hero Section */}
        <div className="relative py-20 px-4 sm:px-6 lg:px-8 banner-gradient">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
          </div>
          
          <div className="relative max-w-5xl mx-auto">
            {/* Badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 backdrop-blur">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">LocalPro Blog & Resources</span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-10">
              <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-slate-900 via-blue-600 to-indigo-600 dark:from-white dark:via-blue-300 dark:to-indigo-300 bg-clip-text text-transparent mb-5 tracking-tight">
                Insights & Updates
              </h1>
              <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
                Discover best practices, industry trends, and success stories from the LocalPro community
              </p>
            </div>

            {/* Search */}
            <div className="max-w-2xl mx-auto mb-8">
              <form method="get" className="relative">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    name="search"
                    defaultValue={search}
                    placeholder="Search articles..."
                    className="w-full px-6 py-4 pl-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all"
                  />
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 sm:px-6 lg:px-8 py-10 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
          <div className="max-w-6xl mx-auto">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-5 uppercase tracking-wide">Browse by Category</p>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/blog"
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                  !category
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                All Articles
              </Link>
              {BLOG_CATEGORIES.map((cat) => (
                <Link
                  key={cat.value}
                  href={`/blog?category=${cat.value}`}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                    category === cat.value
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="relative py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {blogs.length === 0 ? (
              <div className="text-center py-20">
                <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {search || category ? "No articles found" : "No articles published yet"}
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  {search ? `Try a different search term` : `Check back soon for new content`}
                </p>
              </div>
            ) : (
              <>
                {/* Featured Article */}
                {currentPage === 1 && blogs.length > 0 && (
                  <div className="mb-20">
                    <Link
                      href={`/blog/${blogs[0].slug}`}
                      className="group block"
                    >
                      <div className="rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                          {/* Image */}
                          {blogs[0].featuredImage && (
                            <div className="relative h-64 md:h-96 overflow-hidden bg-slate-600">
                              <img
                                src={blogs[0].featuredImage}
                                alt={blogs[0].title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            </div>
                          )}
                          
                          {/* Content */}
                          <div className="p-8 md:p-10 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-5">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wide">✨ Featured</span>
                              {blogs[0].category && (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                                  <Tag className="w-3 h-3" />
                                  {blogs[0].category}
                                </span>
                              )}
                            </div>
                            
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-3 tracking-tight">
                              {blogs[0].title}
                            </h2>
                            
                            <p className="text-slate-600 dark:text-slate-300 text-lg mb-8 line-clamp-3 leading-relaxed">
                              {blogs[0].excerpt || getContentPreview(blogs[0].content, 200)}
                            </p>

                            {/* Meta */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-8 border-t border-slate-200 dark:border-slate-700">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-md" />
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {blogs[0].author && typeof blogs[0].author === "object" && "name" in blogs[0].author
                                      ? blogs[0].author.name
                                      : "LocalPro Editors"}
                                  </p>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">By Author</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6 sm:ml-auto text-slate-600 dark:text-slate-400 font-medium">
                                <div className="flex items-center gap-2.5">
                                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                  <time>
                                    {new Date(blogs[0].publishedAt!).toLocaleDateString(
                                      "en-US",
                                      { year: "numeric", month: "long", day: "numeric" }
                                    )}
                                  </time>
                                </div>
                              </div>
                            </div>

                            <div className="mt-8">
                              <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 group/btn shadow-md hover:shadow-lg">
                                Read Article
                                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                )}

                {/* Blog Grid */}
                {blogs.length > 1 && (
                  <>
                    <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-12 tracking-tight">
                      {currentPage === 1 ? "More Articles" : "Articles"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                      {blogs
                        .slice(currentPage === 1 ? 1 : 0)
                        .map((blog) => (
                          <Link
                            key={blog._id?.toString() || blog.slug}
                            href={`/blog/${blog.slug}`}
                            className="group h-full"
                          >
                            <div className="h-full rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                              {/* Image */}
                              {blog.featuredImage && (
                                <div className="relative h-40 overflow-hidden bg-slate-600">
                                  <img
                                    src={blog.featuredImage}
                                    alt={blog.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  />
                                </div>
                              )}

                              {/* Content */}
                              <div className="flex flex-col flex-1 p-5">
                                {/* Category Badge */}
                                {blog.category && (
                                  <div className="mb-3">
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wide">
                                      {blog.category}
                                    </span>
                                  </div>
                                )}

                                {/* Title */}
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                  {blog.title}
                                </h3>

                                {/* Excerpt */}
                                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 flex-1 line-clamp-2">
                                  {blog.excerpt || getContentPreview(blog.content, 100)}
                                </p>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-700">
                                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                                    <Calendar className="w-4 h-4 flex-shrink-0" />
                                    <time>
                                      {new Date(blog.publishedAt!).toLocaleDateString(
                                        "en-US",
                                        { month: "short", day: "numeric" }
                                      )}
                                    </time>
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform font-semibold" />
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                    </div>
                  </>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {currentPage > 1 && (
                      <Link
                        href={`/blog?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}${category ? `&category=${category}` : ""}`}
                        className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
                      >
                        ← Previous
                      </Link>
                    )}

                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Link
                            key={pageNum}
                            href={`/blog?page=${pageNum}${search ? `&search=${encodeURIComponent(search)}` : ""}${category ? `&category=${category}` : ""}`}
                            className={`px-3 py-2 rounded-lg font-medium transition-all ${
                              currentPage === pageNum
                                ? "bg-blue-600 text-white shadow-md"
                                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                            }`}
                          >
                            {pageNum}
                          </Link>
                        );
                      })}
                      {totalPages > 5 && (
                        <span className="px-3 py-2 text-slate-500">...</span>
                      )}
                    </div>

                    {currentPage < totalPages && (
                      <Link
                        href={`/blog?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}${category ? `&category=${category}` : ""}`}
                        className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
                      >
                        Next →
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* CTA Section */}
        <div className="px-4 sm:px-6 lg:px-8 py-24 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
              Have a story to share?
            </h2>
            <p className="text-blue-100 text-xl mb-10 max-w-2xl mx-auto font-medium">
              Join the LocalPro community and contribute your insights, tips, and success stories
            </p>
            <button className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white text-blue-600 font-bold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl">
              Get in Touch
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading blog page:", error);
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Error Loading Articles
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Please try again later</p>
        </div>
      </div>
    );
  }
}
