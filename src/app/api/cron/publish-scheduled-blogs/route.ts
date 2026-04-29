/**
 * Blog Scheduled Publishing Cron Job
 *
 * Automatically publishes blogs that are scheduled for publishing.
 * Call periodically (e.g. every 5 minutes) via Vercel Cron or external service.
 */

import { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { withHandler, apiResponse } from "@/lib/utils";
import { blogRepository } from "@/repositories";

/**
 * GET /api/cron/publish-scheduled-blogs
 *
 * Publishes all scheduled blogs that have reached their scheduled time.
 * Protected by CRON_SECRET via Authorization: Bearer header.
 */
export const GET = withHandler(async (req: NextRequest) => {
  if (!verifyCronSecret(req)) {
    return apiResponse({ error: "Unauthorized" }, 401);
  }

  const scheduledBlogs = await blogRepository.findScheduledToPublish();

  if (scheduledBlogs.length === 0) {
    return apiResponse({ success: true, message: "No blogs to publish", published: 0 });
  }

  const results = await Promise.all(
    scheduledBlogs.map(async (blog) => {
      try {
        await blogRepository.updateById(blog._id!.toString(), {
          status: "published",
          publishedAt: new Date(),
        });
        return { id: blog._id, title: blog.title, status: "published" };
      } catch (error) {
        console.error(`Failed to publish blog ${blog._id}:`, error);
        return { id: blog._id, title: blog.title, status: "error" };
      }
    })
  );

  const published = results.filter((r) => r.status === "published").length;
  const failed = results.filter((r) => r.status === "error").length;

  return apiResponse({ success: true, message: `Published ${published} blog(s)`, published, failed, results });
});
