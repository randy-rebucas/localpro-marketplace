import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Calendar, User, ArrowRight, ArrowLeft } from "lucide-react";
import { blogRepository } from "@/repositories";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams?: Promise<{ page?: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { category } = await props.params;
  
  const categoryLabels: Record<string, string> = {
    news: "News",
    tutorial: "Tutorials",
    "tips-tricks": "Tips & Tricks",
    "service-update": "Service Updates",
    "provider-story": "Provider Stories",
    "client-story": "Client Stories",
    "industry-insights": "Industry Insights",
    announcement: "Announcements",
    other: "Articles",
  };

  const label = categoryLabels[category] || "Articles";

  return {
    title: `${label} | LocalPro Blog`,
    description: `Browse ${label.toLowerCase()} from LocalPro`,
  };
}

/**
 * Category Blog Listing Page
 */
export default async function CategoryPage(props: PageProps) {
  const { category } = await props.params;
  const searchParams = await props.searchParams;
  const page = Math.max(1, parseInt(searchParams?.page || "1"));

  const categoryLabels: Record<string, string> = {
    news: "News",
    tutorial: "Tutorials",
    "tips-tricks": "Tips & Tricks",
    "service-update": "Service Updates",
    "provider-story": "Provider Stories",
    "client-story": "Client Stories",
    "industry-insights": "Industry Insights",
    announcement: "Announcements",
    other: "Articles",
  };

  const categoryDescriptions: Record<string, string> = {
    news: "Latest news and updates from LocalPro",
    tutorial: "Step-by-step guides and tutorials",
    "tips-tricks": "Pro tips and helpful tricks",
    "service-update": "Updates to our services and features",
    "provider-story": "Stories from our service providers",
    "client-story": "Success stories from our clients",
    "industry-insights": "Industry trends and insights",
    announcement: "Important announcements",
    other: "Other articles",
  };

  const label = categoryLabels[category] || "Articles";
  const description = categoryDescriptions[category] || "Browse articles";

  try {
    const result = await blogRepository.findByCategory(category, page, 12);
    const blogs = result.blogs || [];
    const total = result.total || 0;
    const totalPages = Math.ceil(total / 12);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20">
        {/* Header */}
        <div className="relative py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-700">
          <div className="max-w-site mx-auto">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {label}
            </h1>
            <p className="text-lg text-slate-300 mb-6">{description}</p>
            <div className="text-sm text-slate-400">
              {total} article{total !== 1 ? "s" : ""} in this category
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-site mx-auto">
            {blogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xl text-slate-300 mb-4">
                  No articles in this category yet
                </p>
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Browse All Articles
                </Link>
              </div>
            ) : (
              <>
                {/* Blog Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                  {blogs.map((blog) => (
                    <Link
                      key={blog._id?.toString() || blog.slug}
                      href={`/blog/${blog.slug}`}
                      className="group h-full"
                    >
                      <div className="bg-slate-700/50 backdrop-blur border border-slate-600 rounded-lg overflow-hidden hover:border-indigo-500 transition-all duration-300 hover:shadow-xl h-full flex flex-col">
                        {/* Image */}
                        {blog.featuredImage && (
                          <div className="relative h-48 overflow-hidden bg-slate-600">
                            <img
                              src={blog.featuredImage}
                              alt={blog.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex flex-col flex-1 p-6">
                          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2">
                            {blog.title}
                          </h3>

                          <p className="text-slate-300 text-sm mb-4 flex-1 line-clamp-3">
                            {blog.excerpt || blog.content?.substring(0, 100)}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-4 border-t border-slate-600">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Calendar className="w-3 h-3" />
                              <time>
                                {new Date(blog.publishedAt!).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric", year: "numeric" }
                                )}
                              </time>
                            </div>
                            <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    {page > 1 && (
                      <Link
                        href={`/blog/category/${category}?page=${page - 1}`}
                        className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-indigo-600 text-white transition-colors flex items-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Previous
                      </Link>
                    )}

                    {Array.from({ length: totalPages }).map((_, i) => (
                      <Link
                        key={i + 1}
                        href={`/blog/category/${category}?page=${i + 1}`}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          page === i + 1
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                        }`}
                      >
                        {i + 1}
                      </Link>
                    ))}

                    {page < totalPages && (
                      <Link
                        href={`/blog/category/${category}?page=${page + 1}`}
                        className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-indigo-600 text-white transition-colors flex items-center gap-2"
                      >
                        Next
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading category page:", error);
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
          <p className="text-slate-400">Failed to load articles</p>
          <Link href="/blog" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300">
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }
}
