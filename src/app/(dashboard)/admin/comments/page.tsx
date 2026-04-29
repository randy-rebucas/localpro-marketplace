"use client";

import React, { useState, useEffect } from "react";
import { Metadata } from "next";
import { apiFetch } from "@/lib/fetchClient";
import { 
  Check, 
  X, 
  AlertCircle, 
  MessageSquare, 
  Calendar, 
  User,
  Loader,
  Search,
  RotateCcw,
  Download,
  ChevronDown
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Comment {
  _id: string;
  content: string;
  authorName: string;
  authorEmail: string;
  blogId: string;
  blogTitle?: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected" | "spam";
  parentId?: string | null;
}

interface CommentStats {
  pending: number;
  approved: number;
  rejected: number;
  spam: number;
}

/**
 * Admin Comment Moderation Page
 * 
 * Displays pending comments for moderation with:
 * - Search and filtering
 * - Comment statistics
 * - Approve, Reject, Spam Mark actions
 * - Bulk operations
 * - Export functionality
 */
export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filteredComments, setFilteredComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected" | "spam">("pending");
  const [stats, setStats] = useState<CommentStats>({ pending: 0, approved: 0, rejected: 0, spam: 0 });
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    loadPendingComments();
  }, []);

  // Filter and search effect
  useEffect(() => {
    let filtered = comments.filter(c => 
      filterStatus === "all" || c.status === filterStatus
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.content.toLowerCase().includes(query) ||
        c.authorName.toLowerCase().includes(query) ||
        c.authorEmail.toLowerCase().includes(query) ||
        c.blogTitle?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredComments(filtered);
  }, [comments, searchQuery, filterStatus, sortBy]);

  // Calculate stats
  useEffect(() => {
    const newStats = {
      pending: comments.filter(c => c.status === "pending").length,
      approved: comments.filter(c => c.status === "approved").length,
      rejected: comments.filter(c => c.status === "rejected").length,
      spam: comments.filter(c => c.status === "spam").length,
    };
    setStats(newStats);
  }, [comments]);

  const loadPendingComments = async () => {
    try {
      const res = await fetch("/api/admin/comments?page=1&limit=200");
      if (!res.ok) throw new Error("Failed to fetch comments");
      
      const data = await res.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    commentId: string,
    action: "approve" | "reject" | "spam"
  ) => {
    setActionLoading((prev) => ({ ...prev, [commentId]: true }));

    try {
      const res = await apiFetch(`/api/admin/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) throw new Error("Failed to update comment");

      setComments((prev) => prev.filter((c) => c._id !== commentId));
      setSelectedComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
      toast.success(`Comment ${action}ed successfully`);
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error(`Failed to ${action} comment`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    setActionLoading((prev) => ({ ...prev, [commentId]: true }));

    try {
      const res = await apiFetch(`/api/admin/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete comment");

      setComments((prev) => prev.filter((c) => c._id !== commentId));
      setSelectedComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
      toast.success("Comment deleted successfully");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    } finally {
      setActionLoading((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleBulkAction = async (action: "approve" | "reject" | "spam" | "delete") => {
    if (selectedComments.size === 0) {
      toast.error("No comments selected");
      return;
    }

    if (!confirm(`Are you sure you want to ${action} ${selectedComments.size} comment(s)?`)) return;

    for (const commentId of selectedComments) {
      if (action === "delete") {
        await handleDelete(commentId);
      } else {
        await handleAction(commentId, action);
      }
    }
    setSelectedComments(new Set());
  };

  const toggleSelectComment = (commentId: string) => {
    const newSet = new Set(selectedComments);
    if (newSet.has(commentId)) {
      newSet.delete(commentId);
    } else {
      newSet.add(commentId);
    }
    setSelectedComments(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedComments.size === filteredComments.length) {
      setSelectedComments(new Set());
    } else {
      setSelectedComments(new Set(filteredComments.map(c => c._id)));
    }
  };

  const exportAsCSV = () => {
    if (comments.length === 0) {
      toast.error("No comments to export");
      return;
    }

    const headers = ["ID", "Author", "Email", "Blog", "Content", "Status", "Created At"];
    const rows = comments.map(c => [
      c._id,
      c.authorName,
      c.authorEmail,
      c.blogTitle || "N/A",
      `"${c.content.replace(/"/g, '""')}"`,
      c.status,
      new Date(c.createdAt).toLocaleString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Comments exported successfully");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                  Comment Moderation
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Manage and moderate all blog comments across the platform
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={loadPendingComments}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300"
              >
                <RotateCcw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={exportAsCSV}
                className="px-3.5 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 hover:shadow-sm transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Pending", value: stats.pending, color: "amber", status: "pending" },
            { label: "Approved", value: stats.approved, color: "green", status: "approved" },
            { label: "Rejected", value: stats.rejected, color: "orange", status: "rejected" },
            { label: "Spam", value: stats.spam, color: "red", status: "spam" },
          ].map((stat) => (
            <button
              key={stat.status}
              onClick={() => setFilterStatus(stat.status as any)}
              className={`rounded-2xl border p-4 transition-all shadow-sm hover:shadow-md ${
                filterStatus === stat.status
                  ? `bg-${stat.color}-50 dark:bg-${stat.color}-900/30 border-${stat.color}-300 dark:border-${stat.color}-700`
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <p className={`text-sm font-medium ${filterStatus === stat.status ? `text-${stat.color}-700 dark:text-${stat.color}-400` : "text-slate-600 dark:text-slate-400"}`}>
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stat.value}
              </p>
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by author, email, content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedComments.size > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-sm">
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
              {selectedComments.size} comment(s) selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction("approve")}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800/50 transition-colors"
              >
                Approve All
              </button>
              <button
                onClick={() => handleBulkAction("reject")}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800/50 transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={() => handleBulkAction("spam")}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800/50 transition-colors"
              >
                Mark Spam
              </button>
              <button
                onClick={() => handleBulkAction("delete")}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800/50 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        )}

        {/* Comments List */}
        {filteredComments.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-sm">
            <MessageSquare className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {comments.length === 0 ? "No comments yet" : "No comments match your filters"}
            </p>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {searchQuery ? "Try adjusting your search" : "All comments have been moderated"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select All */}
            {filteredComments.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={selectedComments.size === filteredComments.length && filteredComments.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Select all visible comments
                </span>
              </div>
            )}

            {filteredComments.map((comment) => (
              <div
                key={comment._id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm"
              >
                {/* Comment Header */}
                <div className="flex items-start gap-4 mb-4">
                  <input
                    type="checkbox"
                    checked={selectedComments.has(comment._id)}
                    onChange={() => toggleSelectComment(comment._id)}
                    className="w-4 h-4 rounded cursor-pointer mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {comment.authorName}
                        </span>
                      </div>
                      <span className="text-sm text-slate-500">
                        {comment.authorEmail}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </div>
                      {comment.blogTitle && (
                        <a
                          href={`/blog/${comment.blogTitle?.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          On: {comment.blogTitle}
                        </a>
                      )}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 whitespace-nowrap">
                    {comment.status}
                  </span>
                </div>

                {/* Comment Content */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4 border border-slate-200 dark:border-slate-600">
                  <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words text-sm">
                    {comment.content}
                  </p>
                </div>

                {/* Reply Badge (if applicable) */}
                {comment.parentId && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
                    <MessageSquare className="w-4 h-4" />
                    Reply to existing comment
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => handleDelete(comment._id)}
                    disabled={actionLoading[comment._id]}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleAction(comment._id, "spam")}
                    disabled={actionLoading[comment._id]}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Spam
                  </button>
                  <button
                    onClick={() => handleAction(comment._id, "reject")}
                    disabled={actionLoading[comment._id]}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleAction(comment._id, "approve")}
                    disabled={actionLoading[comment._id]}
                    className="px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 hover:bg-green-200 dark:hover:bg-green-900/50 text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
