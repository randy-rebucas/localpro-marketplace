import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { Calendar, User, Share2, Tag, Eye, AlertCircle } from "lucide-react";
import { blogRepository } from "@/repositories";
import { getCurrentUser } from "@/lib/auth";
import { verifyPreviewToken } from "@/lib/preview-token";
import BlogContent from "../BlogContent";
import ShareSection from "../ShareSection";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

/**
 * Blog Article Preview Page
 * 
 * - Allows staff/authors to preview draft/scheduled blogs
 * - Requires valid preview token
 * - Token is time-limited (7 days)
 * - Author verification is enforced
 */
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const { token } = await props.searchParams;

  try {
    // Verify token first
    if (!token || typeof token !== "string") {
      return { title: "Preview - Invalid Token" };
    }

    const payload = verifyPreviewToken(token);
    if (!payload) {
      return { title: "Preview - Token Expired or Invalid" };
    }

    const blog = await blogRepository.findById(payload.blogId);
    if (!blog) return { title: "Article Not Found" };

    return {
      title: `${blog.title} (PREVIEW) | LocalPro Blog`,
      description: `[PREVIEW] ${blog.metaDescription || blog.excerpt}`,
      robots: { index: false, follow: false }, // Don't index preview pages
    };
  } catch {
    return { title: "Preview Error" };
  }
}

export default async function BlogArticlePreviewPage(props: PageProps) {
  const { slug } = await props.params;
  const { token } = await props.searchParams;

  // Verify user is authenticated
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?from=/blog/${slug}/preview?token=${token}`);
  }

  // Verify token
  if (!token || typeof token !== "string") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                Invalid Preview Token
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                A preview token is required to view this article.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const payload = verifyPreviewToken(token);
  if (!payload) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                Preview Token Expired
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                This preview link has expired. Generate a new one from the admin dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fetch blog by ID from token (not by slug, as draft blogs might have different slugs)
  const blog = await blogRepository.findById(payload.blogId);
  if (!blog) {
    return notFound();
  }

  // Verify user has permission to view this preview
  const authorId =
    typeof blog.author === "object" ? blog.author._id : blog.author;
  const isAuthor = authorId.toString() === user.userId;
  const isAdmin =
    user.role === "admin" ||
    (user.role === "staff" && user.capabilities?.includes("manage_blogs"));

  if (!isAuthor && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                Access Denied
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                You do not have permission to preview this article.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Format read time
  const wordCount = blog.content
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  const readTime = Math.ceil(wordCount / 200);

  const publishDate = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : blog.createdAt
    ? new Date(blog.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not published";

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Preview Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/40">
              <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Preview Mode
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Status: <span className="capitalize font-medium">{blog.status}</span>
                {blog.scheduledFor && (
                  <>
                    • Scheduled for:{" "}
                    {new Date(blog.scheduledFor).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Article Container */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-4"
          >
            ← Back to Blog
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
            {blog.title}
          </h1>

          {blog.excerpt && (
            <p className="text-xl text-slate-600 dark:text-slate-300">
              {blog.excerpt}
            </p>
          )}

          {/* Article Meta */}
          <div className="flex flex-wrap items-center gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            {/* Author */}
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {typeof blog.author === "object" && "name" in blog.author
                  ? (blog.author as import("@/models/Blog").PopulatedAuthor).name
                  : "Unknown Author"}
              </span>
            </div>

            {/* Publish Date */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {publishDate}
              </span>
            </div>

            {/* Read Time */}
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 text-slate-500 dark:text-slate-400">
                📖
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {readTime} min read
              </span>
            </div>

            {/* Category */}
            {blog.category && (
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                  {blog.category.replace("-", " ")}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Featured Image */}
        {blog.featuredImage && (
          <div className="mb-8 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blog.featuredImage}
              alt={blog.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose dark:prose-invert max-w-none mb-12">
          <BlogContent content={blog.content} />
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Share this preview:
          </p>
          <ShareSection title={blog.title} slug={blog.slug} />
        </div>
      </article>
    </main>
  );
}
