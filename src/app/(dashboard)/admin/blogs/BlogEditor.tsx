"use client";

import React, { useState, useRef } from "react";
import { toast } from "react-hot-toast";
import {
  X,
  Upload,
  Calendar,
  Bold,
  Italic,
  Link2,
  List,
  Eye,
  Code2,
  Heading2,
  Quote,
} from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type { IBlog } from "@/models/Blog";

interface BlogEditorProps {
  blog?: IBlog | null;
  onClose: () => void;
  onSave: (blog: IBlog) => void;
}

type BlogStatus = "draft" | "published" | "scheduled" | "archived";
type PreviewMode = "edit" | "preview" | "split";
type BlogCategory = 
  | "news"
  | "tutorial"
  | "tips-tricks"
  | "service-update"
  | "provider-story"
  | "client-story"
  | "industry-insights"
  | "announcement"
  | "other";

/**
 * Blog Editor Modal Component
 * 
 * Handles creation and editing of blog posts with:
 * - Title & auto-slug generation
 * - Rich text content
 * - Featured image upload
 * - SEO metadata
 * - Status and scheduling
 */
export default function BlogEditor({ blog, onClose, onSave }: BlogEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState({
    title: blog?.title || "",
    content: blog?.content || "",
    excerpt: blog?.excerpt || "",
    featuredImage: blog?.featuredImage || "",
    metaDescription: blog?.metaDescription || "",
    keywords: blog?.keywords?.join(", ") || "",
    category: (blog?.category || "other") as BlogCategory,
    status: (blog?.status || "draft") as BlogStatus,
    scheduledFor: blog?.scheduledFor
      ? new Date(blog.scheduledFor).toISOString().slice(0, 16)
      : "",
  });

  // Insert markdown formatting
  const insertMarkdown = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = formData.content.substring(start, end);
    const newContent =
      formData.content.substring(0, start) +
      before +
      selected +
      after +
      formData.content.substring(end);

    setFormData((prev) => ({
      ...prev,
      content: newContent,
    }));

    // Focus back and move cursor
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + before.length;
    });
  };

  // Render markdown preview
  const renderPreview = () => {
    try {
      const result = marked.parse(formData.content, { breaks: true, async: false });
      const html = typeof result === 'string' ? result : '';
      const clean = DOMPurify.sanitize(html);
      return clean;
    } catch (error) {
      console.error('Preview error:', error);
      return '';
    }
  };
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const slug = generateSlug(formData.title);

  // Handle form changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle image upload to Cloudinary
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const loadingToast = toast.loading("Uploading image...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/blogs/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await res.json();
      setFormData((prev) => ({
        ...prev,
        featuredImage: result.data.url,
      }));

      toast.success("Image uploaded successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload image"
      );
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("Content is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        keywords: formData.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        scheduledFor:
          formData.status === "scheduled" && formData.scheduledFor
            ? new Date(formData.scheduledFor).toISOString()
            : null,
      };

      if (blog?._id) {
        // Update existing
        const res = await fetch(`/api/admin/blogs/${blog._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update blog");
        const saved = await res.json();
        onSave(saved.data);
      } else {
        // Create new
        const res = await fetch("/api/admin/blogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create blog");
        const saved = await res.json();
        onSave(saved.data);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save blog"
      );
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {blog ? "Edit Blog" : "New Blog"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter blog title"
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {formData.title && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Slug: <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">{slug}</code>
              </p>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Excerpt <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="Brief summary for blog listing"
              rows={2}
              maxLength={500}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              {formData.excerpt.length}/500 characters
            </p>
          </div>

          {/* Content with Markdown Editor */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Content
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMode("edit")}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    previewMode === "edit"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("preview")}
                  className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1 ${
                    previewMode === "preview"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("split")}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    previewMode === "split"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Split
                </button>
              </div>
            </div>

            {/* Markdown Toolbar */}
            {previewMode !== "preview" && (
              <div className="flex flex-wrap gap-1 p-2 bg-slate-100 dark:bg-slate-900 rounded-t-lg border border-b-0 border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => insertMarkdown("**", "**")}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("*", "*")}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("[text](url)")}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Link"
                >
                  <Link2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("## ")}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Heading"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("- ")}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("> ")}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Quote"
                >
                  <Quote className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("```\n", "\n```")}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Code Block"
                >
                  <Code2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Editor Area */}
            <div className="flex gap-2 min-h-64">
              {/* Editor Pane */}
              {previewMode !== "preview" && (
                <textarea
                  ref={textareaRef}
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Write your blog content here (supports markdown)"
                  className={`flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm ${
                    previewMode === "split" ? "" : "rounded-b-lg"
                  }`}
                  style={{
                    borderBottomLeftRadius:
                      previewMode === "split" ? "0" : undefined,
                    borderBottomRightRadius:
                      previewMode === "split" ? "0" : undefined,
                  }}
                />
              )}

              {/* Preview Pane */}
              {previewMode !== "edit" && (
                <div
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-auto prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderPreview() }}
                />
              )}
            </div>
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Featured Image <span className="text-slate-500">(optional)</span>
            </label>
            <div className="flex gap-4">
              {formData.featuredImage && (
                <img
                  src={formData.featuredImage}
                  alt="Featured"
                  className="w-24 h-24 rounded-lg object-cover"
                />
              )}
              <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Upload className="w-4 h-4" />
                Upload Image
                <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
              </label>
            </div>
          </div>

          {/* SEO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Meta Description <span className="text-slate-500">(optional)</span>
              </label>
              <textarea
                name="metaDescription"
                value={formData.metaDescription}
                onChange={handleChange}
                placeholder="SEO meta description"
                rows={2}
                maxLength={160}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                {formData.metaDescription.length}/160 characters
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Keywords <span className="text-slate-500">(comma separated, optional)</span>
              </label>
              <input
                type="text"
                name="keywords"
                value={formData.keywords}
                onChange={handleChange}
                placeholder="keyword1, keyword2, keyword3"
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Status & Scheduling */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="news">News</option>
                <option value="tutorial">Tutorials</option>
                <option value="tips-tricks">Tips & Tricks</option>
                <option value="service-update">Service Updates</option>
                <option value="provider-story">Provider Stories</option>
                <option value="client-story">Client Stories</option>
                <option value="industry-insights">Industry Insights</option>
                <option value="announcement">Announcements</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Publish Now</option>
                <option value="scheduled">Schedule for Later</option>
                <option value="archived">Archive</option>
              </select>
            </div>

            {formData.status === "scheduled" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Publish Date & Time
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <input
                    type="datetime-local"
                    name="scheduledFor"
                    value={formData.scheduledFor}
                    onChange={handleChange}
                    min={new Date().toISOString().slice(0, 16)}
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-4 justify-end pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Saving..." : blog ? "Update Blog" : "Create Blog"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
