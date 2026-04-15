import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Mail, ArrowRight, BookOpen } from "lucide-react";
import { blogRepository } from "@/repositories";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

interface PageProps {
  params: Promise<{ authorId: string }>;
}

/**
 * Generate static params for author pages
 */
export async function generateStaticParams() {
  try {
    await connectDB();
    // Get authors who have published at least one blog
    const result = await blogRepository.findPublished(1, 1000);
    const uniqueAuthors = new Set(
      (result.blogs || [])
        .filter((b) => b.author)
        .map((b) => {
          const author = b.author as any;
          return author._id?.toString?.() || author;
        })
    );

    return Array.from(uniqueAuthors).map((authorId) => ({
      authorId: String(authorId),
    }));
  } catch (error) {
    console.error("Error generating static params for authors:", error);
    return [];
  }
}

/**
 * Generate metadata for author page
 */
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { authorId } = await props.params;

  try {
    await connectDB();
    const author = await User.findById(authorId).lean();

    if (!author) {
      return { title: "Author Not Found" };
    }

    return {
      title: `${author.name} | LocalPro Authors`,
      description: `Read articles by ${author.name} on the LocalPro blog`,
    };
  } catch {
    return { title: "Author Not Found" };
  }
}

/**
 * Author Profile Page
 * Displays author bio and all their published articles
 */
export default async function AuthorPage(props: PageProps) {
  const { authorId } = await props.params;

  try {
    await connectDB();

    // Fetch author info
    const author = await User.findById(authorId).lean();

    if (!author) {
      notFound();
    }

    // Fetch all articles by this author
    const allArticles = await blogRepository.findPublished(1, 100);
    const authorArticles = (allArticles.blogs || [])
      .filter((b) => {
        const blogAuthor = b.author as any;
        return (
          blogAuthor?._id?.toString?.() === authorId ||
          blogAuthor?.toString?.() === authorId
        );
      })
      .sort(
        (a, b) =>
          new Date(b.publishedAt!).getTime() -
          new Date(a.publishedAt!).getTime()
      );

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Author Header */}
        <div className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="absolute inset-0 overflow-hidden opacity-10">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-5xl mx-auto">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-white hover:text-blue-100 font-semibold mb-8 transition-colors"
            >
              ← Back to Blog
            </Link>

            <div className="flex flex-col md:flex-row items-start gap-8">
              {/* Avatar */}
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-300 to-blue-600 flex-shrink-0 shadow-xl" />

              {/* Author Info */}
              <div className="flex-1 text-white">
                <h1 className="text-5xl font-black mb-4 tracking-tight">
                  {author.name}
                </h1>

                <p className="text-blue-100 text-lg mb-6">
                  Expert contributor sharing insights and updates on the LocalPro blog
                </p>

                <div className="flex flex-wrap gap-6 mb-6">
                  {author.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      <a
                        href={`mailto:${author.email}`}
                        className="hover:underline"
                      >
                        {author.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Articles Section */}
        <div className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {authorArticles.length === 0 ? (
              <div className="text-center py-20">
                <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-xl font-semibold text-slate-900 dark:text-white">
                  No articles published yet
                </p>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Check back soon for new content from {author.name}
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-12 tracking-tight">
                  Articles by {author.name} ({authorArticles.length})
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {authorArticles.map((article) => (
                    <Link
                      key={article._id?.toString() || article.slug}
                      href={`/blog/${article.slug}`}
                      className="group h-full"
                    >
                      <div className="h-full rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                        {/* Featured Image */}
                        {article.featuredImage && (
                          <div className="relative h-48 overflow-hidden bg-slate-600">
                            <img
                              src={article.featuredImage}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex flex-col flex-1 p-6">
                          {/* Category Badge */}
                          {article.category && (
                            <div className="mb-3">
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wide">
                                {article.category}
                              </span>
                            </div>
                          )}

                          {/* Title */}
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {article.title}
                          </h3>

                          {/* Excerpt */}
                          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 flex-1 line-clamp-2">
                            {article.excerpt}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                            <time className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {new Date(article.publishedAt!).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" }
                              )}
                            </time>
                            <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading author page:", error);
    notFound();
  }
}
