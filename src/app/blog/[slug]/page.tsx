import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Calendar, User, Share2, Tag, ArrowRight } from "lucide-react";
import { blogRepository } from "@/repositories";
import { blogCommentRepository } from "@/repositories/blog-comment.repository";
import BlogContent from "./BlogContent";
import ShareSection from "./ShareSection";
import BlogComments from "./BlogComments";
import AnalyticsTracker from "./AnalyticsTracker";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate static params for published blog articles
 * This helps Next.js pre-generate pages at build time
 */
export async function generateStaticParams() {
  try {
    const result = await blogRepository.findPublished(1, 100);
    return (result.blogs || []).map((blog) => ({
      slug: blog.slug,
    }));
  } catch (error) {
    console.error("Error generating static params for blogs:", error);
    return [];
  }
}

/**
 * Generate static metadata for blog articles
 */
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
        images: blog.featuredImage
          ? [{ url: blog.featuredImage }]
          : undefined,
      },
    };
  } catch {
    return { title: "Article Not Found" };
  }
}

/**
 * Individual Blog Article Page
 * 
 * - Server-rendered for SEO
 * - Markdown content rendering
 * - Author and publication info
 * - Social sharing
 * - Development: fallback to draft/scheduled blogs if no published version exists
 */
export default async function BlogArticlePage(props: PageProps) {
  const { slug } = await props.params;

  try {
    const blog = await blogRepository.findBySlug(slug);

    if (!blog) {
      console.warn(`Blog not found for slug: ${slug}`);
      console.warn(`Attempted to find: published blog with slug "${slug}" and publishedAt in the past`);
      console.warn(`If in development mode, unpublished blogs should be shown. Verify the blog exists and has status='published'.`);
      notFound();
    }

    // Format date
    const publishDate = new Date(blog.publishedAt!).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );

    // Get related articles (same category/tags)
    const relatedBlogs = await blogRepository.findPublished(1, 3);
    const related = relatedBlogs.blogs
      ?.filter((b) => b.slug !== slug)
      .slice(0, 3) ||
      [];

    // Get comments for this blog
    const commentsResult = await blogCommentRepository.getApprovedComments(
      blog._id?.toString() || "",
      1,
      20
    );
    const commentCount = await blogCommentRepository.getCommentCount(
      blog._id?.toString() || ""
    );

    return (
      <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Featured Image */}
        {blog.featuredImage && (
          <div className="relative h-96 md:h-[500px] lg:h-[600px] overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900">
            <img
              src={blog.featuredImage}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        )}

        {/* Article Content */}
        <article className="py-16 px-4 sm:px-6 lg:px-8">
          <AnalyticsTracker blogId={blog._id?.toString() || ""} />
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <header className="mb-16">
              {/* Category Badge */}
              {blog.category && (
                <div className="mb-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wide">
                    <Tag className="w-3.5 h-3.5" />
                    {blog.category}
                  </span>
                </div>
              )}

              {/* Title */}
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 leading-tight tracking-tight">
                {blog.title}
              </h1>

              {/* Excerpt */}
              {blog.excerpt && (
                <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed font-medium">
                  {blog.excerpt}
                </p>
              )}

              {/* Meta Information */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-8 pt-10 border-t border-slate-200 dark:border-slate-800">
                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-base">
                      {blog.author && typeof blog.author === "object" && "name" in blog.author
                        ? blog.author.name 
                        : "LocalPro Staff"}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Author</p>
                  </div>
                </div>

                {/* Date & Read Time */}
                <div className="flex items-center gap-6 sm:ml-auto">
                  <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400 font-medium">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <time>{publishDate}</time>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                    {Math.ceil(blog.content.split(/\s+/).length / 200)} min read
                  </div>
                </div>
              </div>
            </header>

            {/* Content */}
            <div className="mb-16">
              <BlogContent content={blog.content} />
            </div>

            {/* Tags/Keywords */}
            {blog.keywords && blog.keywords.length > 0 && (
              <div className="py-10 border-t border-slate-200 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-5 uppercase tracking-wide">Tags</p>
                <div className="flex flex-wrap gap-2.5">
                  {blog.keywords.map((keyword) => (
                    <Link
                      key={keyword}
                      href={`/blog?search=${encodeURIComponent(keyword)}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-semibold transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    >
                      #{keyword}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Share Section */}
            <ShareSection title={blog.title} slug={blog.slug} />

            {/* Comments Section */}
            <BlogComments
              blogId={blog._id?.toString() || ""}
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

            {/* Related Articles */}
            {related.length > 0 && (
              <div className="mt-20 pt-14 border-t border-slate-200 dark:border-slate-800">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-12 tracking-tight">
                  Related Articles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {related.map((relatedBlog) => (
                    <Link
                      key={relatedBlog._id?.toString() || relatedBlog.slug}
                      href={`/blog/${relatedBlog.slug}`}
                      className="group h-full"
                    >
                      <div className="h-full rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                        {relatedBlog.featuredImage && (
                          <div className="relative h-40 overflow-hidden bg-slate-200 dark:bg-slate-700">
                            <img
                              src={relatedBlog.featuredImage}
                              alt={relatedBlog.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                        )}
                        <div className="p-5 flex-1 flex flex-col">
                          {relatedBlog.category && (
                            <div className="mb-3">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                                {relatedBlog.category}
                              </span>
                            </div>
                          )}
                          <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                            {relatedBlog.title}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 flex-1">
                            {relatedBlog.excerpt}
                          </p>
                          <div className="pt-4 mt-auto">
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                              Read More →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>

        {/* CTA Section */}
        <div className="px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to grow with LocalPro?
            </h2>
            <p className="text-blue-100 text-lg mb-8">
              Join thousands of service professionals and home service businesses
            </p>
            <button className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-colors shadow-lg">
              Get Started Today
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading article:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    
    // In development, provide more debugging info
    if (process.env.NODE_ENV === "development") {
      console.error(`Development mode: Check that the blog slug "${slug}" exists, is published, and has a publishedAt date.`);
    }
    
    return notFound();
  }
}
