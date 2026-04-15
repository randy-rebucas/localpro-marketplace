"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";

interface Comment {
  _id: string;
  authorName: string;
  content: string;
  likes: number;
  createdAt: string;
}

interface CommentsProps {
  blogId: string;
  initialComments: Comment[];
  totalComments: number;
}

/**
 * Comments section for blog articles
 * Displays approved comments with ability to post new comments
 */
export default function BlogComments({
  blogId,
  initialComments,
  totalComments,
}: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    authorName: "",
    authorEmail: "",
    content: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/blog/${blogId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSubmitted(true);
        setFormData({ authorName: "", authorEmail: "", content: "" });
        setTimeout(() => {
          setShowForm(false);
          setSubmitted(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-20 pt-14 border-t border-slate-200 dark:border-slate-800">
      <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-12 tracking-tight">
        Comments ({totalComments})
      </h2>

      {/* Comments List */}
      {comments.length > 0 && (
        <div className="space-y-6 mb-12">
          {comments.map((comment) => (
            <article
              key={comment._id}
              className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {comment.authorName}
                  </p>
                  <time className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(comment.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {comment.content}
              </p>
              <div className="mt-4 flex gap-4">
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  👍 Like ({comment.likes})
                </button>
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  ↩️ Reply
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Comment Form */}
      {!showForm && !submitted && (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg mb-8"
        >
          <MessageCircle className="w-4 h-4" />
          Leave a Comment
        </button>
      )}

      {submitted && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 mb-8">
          <p className="text-green-700 dark:text-green-300 font-semibold">
            ✓ Your comment has been submitted for moderation. We'll review it
            shortly!
          </p>
        </div>
      )}

      {showForm && !submitted && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8"
        >
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
            What are your thoughts?
          </h3>

          <div className="space-y-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.authorName}
                  onChange={(e) =>
                    setFormData({ ...formData, authorName: e.target.value })
                  }
                  placeholder="Your name"
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.authorEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, authorEmail: e.target.value })
                  }
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Comment
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Share your thoughts..."
                rows={5}
                className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition-all duration-200"
            >
              <Send className="w-4 h-4" />
              {loading ? "Posting..." : "Post Comment"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({ authorName: "", authorEmail: "", content: "" });
              }}
              className="px-6 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
