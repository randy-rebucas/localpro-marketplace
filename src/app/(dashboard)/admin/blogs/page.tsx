import { getCurrentUser } from "@/lib/auth";
import { blogRepository } from "@/repositories";
import BlogsManager from "./BlogsManager";
import { BookOpen, AlertCircle } from "lucide-react";
import { Suspense } from "react";

/**
 * Admin Blogs Management Page
 * 
 * Server component that:
 * - Checks admin/staff access
 * - Fetches initial blog data with error handling
 * - Displays stats and blog list
 */

// Helper to serialize blog data for client component
function serializeBlogData(data: any) {
  if (!data) return null;
  
  return {
    blogs: data.blogs.map((blog: any) => ({
      _id: blog._id?.toString?.() || blog._id,
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      excerpt: blog.excerpt,
      featuredImage: blog.featuredImage,
      author: typeof blog.author === "object" 
        ? {
            _id: blog.author._id?.toString?.() || blog.author._id,
            name: blog.author.name,
            email: blog.author.email,
          }
        : blog.author?.toString?.() || blog.author,
      status: blog.status,
      publishedAt: blog.publishedAt,
      scheduledFor: blog.scheduledFor,
      category: blog.category,
      metaDescription: blog.metaDescription,
      keywords: blog.keywords,
      createdAt: blog.createdAt,
      updatedAt: blog.updatedAt,
      isDeleted: blog.isDeleted,
      deletedAt: blog.deletedAt,
    })),
    total: data.total,
    page: data.page,
    limit: data.limit,
  };
}

// Stat card component for reusability
interface StatCardProps {
  label: string;
  value: number | string;
  bgColor: string;
  textColor: string;
}

function StatCard({ label, value, bgColor, textColor }: StatCardProps) {
  return (
    <div className={`flex-1 min-w-[120px] p-4 rounded-lg ${bgColor}`}>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${textColor}`}>
        {value}
      </p>
    </div>
  );
}

// Stats loading skeleton
function StatsSkeleton() {
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex-1 min-w-[120px] p-4 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse">
          <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-12 mb-2" />
          <div className="h-7 bg-slate-200 dark:bg-slate-600 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

// Stats component with suspense boundary
async function BlogStats() {
  try {
    const stats = await blogRepository.getStats();
    return (
      <div className="flex flex-wrap gap-3">
        <StatCard
          label="Total"
          value={stats.total}
          bgColor="bg-slate-50 dark:bg-slate-700"
          textColor="text-slate-900 dark:text-white"
        />
        <StatCard
          label="Published"
          value={stats.published}
          bgColor="bg-green-50 dark:bg-green-900/20"
          textColor="text-green-700 dark:text-green-300"
        />
        <StatCard
          label="Draft"
          value={stats.draft}
          bgColor="bg-amber-50 dark:bg-amber-900/20"
          textColor="text-amber-700 dark:text-amber-300"
        />
        <StatCard
          label="Scheduled"
          value={stats.scheduled}
          bgColor="bg-blue-50 dark:bg-blue-900/20"
          textColor="text-blue-700 dark:text-blue-300"
        />
        <StatCard
          label="Archived"
          value={stats.archived}
          bgColor="bg-slate-100 dark:bg-slate-700"
          textColor="text-slate-700 dark:text-slate-300"
        />
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch blog stats:", error);
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <p className="text-sm text-red-700 dark:text-red-300">
          Failed to load statistics. Please try refreshing the page.
        </p>
      </div>
    );
  }
}

export default async function BlogsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null; // Middleware will redirect
  }

  // Check if user has manage_blogs capability
  const canManageBlogs =
    user.role === "admin" ||
    (user.role === "staff" && user.capabilities?.includes("manage_blogs"));

  if (!canManageBlogs) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <BookOpen className="w-12 h-12 text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Access Denied
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          You do not have permission to manage blogs
        </p>
      </div>
    );
  }

  // Fetch initial data with error handling
  let initialData = null;
  let dataError = false;

  try {
    initialData = await blogRepository.findAll({
      page: 1,
      limit: 10,
      author: user.userId,
    });
  } catch (error) {
    console.error("Failed to fetch initial blogs:", error);
    dataError = true;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
          <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Blog Management</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Create, edit, and publish articles for your audience</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <Suspense fallback={<StatsSkeleton />}>
          <BlogStats />
        </Suspense>
      </div>

      {/* Main Content */}
      {dataError ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Failed to Load Blogs
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              There was an error loading your blogs. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      ) : (
        <BlogsManager
          initialData={serializeBlogData(initialData) || { blogs: [], total: 0, page: 1, limit: 10 }}
          userId={user.userId}
        />
      )}
    </div>
  );
}
