"use client";

import React, { useState, useCallback } from "react";
import { apiFetch } from "@/lib/fetchClient";
import { toast } from "react-hot-toast";
import {
  Trash2,
  Edit2,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Eye,
  EyeOff,
  BookOpen,
  List,
  Grid,
} from "lucide-react";
import BlogEditor from "./BlogEditor";
import type { IBlog } from "@/models/Blog";

interface BlogsManagerProps {
  initialData: {
    blogs: IBlog[];
    total: number;
    page: number;
    limit: number;
  };
  userId: string;
}

type BlogStatus = "draft" | "published" | "scheduled" | "archived";

/**
 * Blogs Manager Client Component
 * 
 * Handles:
 * - List view with pagination and search
 * - Status filtering
 * - Create/Edit/Delete operations
 * - Real-time UI updates
 */
export default function BlogsManager({ initialData, userId }: BlogsManagerProps) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BlogStatus | "">("");
  const [selectedBlog, setSelectedBlog] = useState<IBlog | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Fetch blogs with filters
  const fetchBlogs = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
        });

        if (searchQuery) {
          params.set("search", searchQuery);
        }
        if (statusFilter) {
          params.set("status", statusFilter);
        }

        const res = await fetch(`/api/admin/blogs?${params}`);
        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Failed to fetch blogs: ${res.status} ${error}`);
        }
        const result = await res.json();
        setData(result.data);
      } catch (err) {
        toast.error("Failed to load blogs");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, statusFilter]
  );

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Handle filter
  const handleFilterChange = (status: BlogStatus | "") => {
    setStatusFilter(status);
  };

  // Refetch when search/filter changes
  React.useEffect(() => {
    fetchBlogs(1);
  }, [searchQuery, statusFilter, fetchBlogs]);

  // Handle edit
  const handleEdit = (blog: IBlog) => {
    setSelectedBlog(blog);
    setIsEditorOpen(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog?")) {
      return;
    }

    try {
      const res = await apiFetch(`/api/admin/blogs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete blog");

      toast.success("Blog deleted successfully");
      setData((prev) => ({
        ...prev,
        blogs: prev.blogs.filter((b) => b._id !== id),
        total: prev.total - 1,
      }));
    } catch (err) {
      toast.error("Failed to delete blog");
      console.error(err);
    }
  };

  // Handle editor close
  const handleEditorClose = () => {
    setSelectedBlog(null);
    setIsEditorOpen(false);
  };

  // Handle blog saved
  const handleBlogSaved = async (blog: IBlog) => {
    if (selectedBlog) {
      // Update existing blog in list
      setData((prev) => ({
        ...prev,
        blogs: prev.blogs.map((b) => (b._id === blog._id ? blog : b)),
      }));
      toast.success("Blog updated successfully");
    } else {
      // New blog created
      setData((prev) => ({
        ...prev,
        blogs: [blog, ...prev.blogs],
        total: prev.total + 1,
      }));
      toast.success("Blog created successfully");
    }
    handleEditorClose();
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> =
      {
        draft: {
          bg: "bg-slate-100 dark:bg-slate-700",
          text: "text-slate-700 dark:text-slate-300",
          label: "Draft",
        },
        published: {
          bg: "bg-green-100 dark:bg-green-900/30",
          text: "text-green-700 dark:text-green-300",
          label: "Published",
        },
        scheduled: {
          bg: "bg-blue-100 dark:bg-blue-900/30",
          text: "text-blue-700 dark:text-blue-300",
          label: "Scheduled",
        },
        archived: {
          bg: "bg-red-100 dark:bg-red-900/30",
          text: "text-red-700 dark:text-red-300",
          label: "Archived",
        },
      };

    const badge = badges[status] || badges.draft;
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // Format date
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col lg:flex-row gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search blogs..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value as BlogStatus | "")}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="archived">Archived</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={() => {
              setSelectedBlog(null);
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Blog
          </button>
        </div>
      </div>

      {/* Blogs Display - List or Grid */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {data.blogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery || statusFilter ? "No blogs found" : "No blogs yet. Create your first blog!"}
            </p>
          </div>
        ) : viewMode === "list" ? (
          // List View - Table
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Published
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {data.blogs.map((blog) => (
                  <tr
                    key={blog._id?.toString() || blog.slug}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <a
                        href={`/blog/${blog.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {blog.title}
                      </a>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(blog.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {blog.publishedAt ? formatDate(blog.publishedAt) : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(blog.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(blog)}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors text-slate-600 dark:text-slate-400"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(blog._id as string)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors text-red-600 dark:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Grid View - Cards
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.blogs.map((blog) => (
                <div
                  key={blog._id?.toString() || blog.slug}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden hover:shadow-lg dark:hover:shadow-slate-900/50 transition-shadow flex flex-col"
                >
                  {/* Featured Image */}
                  {blog.featuredImage && (
                    <div className="relative h-48 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <img
                        src={blog.featuredImage}
                        alt={blog.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-grow">
                    {/* Title */}
                    <a
                      href={`/blog/${blog.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 mb-2 line-clamp-2 transition-colors"
                    >
                      {blog.title}
                    </a>

                    {/* Excerpt */}
                    {blog.excerpt && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                        {blog.excerpt}
                      </p>
                    )}

                    {/* Category */}
                    {blog.category && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                          {blog.category}
                        </span>
                      </div>
                    )}

                    {/* Status & Dates */}
                    <div className="flex items-center justify-between mb-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex flex-col gap-1">
                        <div>{getStatusBadge(blog.status)}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {formatDate(blog.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(blog)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors font-medium text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(blog._id as string)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data.total > data.limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing {(data.page - 1) * data.limit + 1} to{" "}
            {Math.min(data.page * data.limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchBlogs(data.page - 1)}
              disabled={data.page === 1 || isLoading}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.ceil(data.total / data.limit) }).map(
              (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => fetchBlogs(i + 1)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    data.page === i + 1
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {i + 1}
                </button>
              )
            )}
            <button
              onClick={() => fetchBlogs(data.page + 1)}
              disabled={
                data.page === Math.ceil(data.total / data.limit) || isLoading
              }
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Blog Editor Modal */}
      {isEditorOpen && (
        <BlogEditor
          blog={selectedBlog}
          onClose={handleEditorClose}
          onSave={handleBlogSaved}
        />
      )}
    </div>
  );
}
