/**
 * Blog Scheduled Publishing Cron Job
 * 
 * Automatically publishes blogs that are scheduled for publishing
 * Call this endpoint periodically (e.g., every 5 minutes) via external service
 * Examples: GitHub Actions, Vercel Cron, AWS Lambda, Node-cron
 */

import { withHandler, apiResponse } from "@/lib/utils";
import { blogRepository } from "@/repositories";

/**
 * GET /api/cron/publish-scheduled-blogs
 * 
 * Publishes all scheduled blogs that have reached their scheduled time
 * Protected by CRON_SECRET token to prevent unauthorized access
 */
export const GET = withHandler(async (req) => {
  // Verify cron secret
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiResponse(
      { error: "Unauthorized" },
      401
    );
  }

  try {
    // Find blogs scheduled for publishing
    const scheduledBlogs = await blogRepository.findScheduledToPublish();

    if (scheduledBlogs.length === 0) {
      return apiResponse({
        success: true,
        message: "No blogs to publish",
        published: 0,
      });
    }

    // Auto-publish each blog
    const results = await Promise.all(
      scheduledBlogs.map(async (blog) => {
        try {
          await blogRepository.updateById(blog._id!.toString(), {
            status: "published",
            publishedAt: new Date(),
          });
          return {
            id: blog._id,
            title: blog.title,
            status: "published",
          };
        } catch (error) {
          console.error(`Failed to publish blog ${blog._id}:`, error);
          return {
            id: blog._id,
            title: blog.title,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    const published = results.filter((r) => r.status === "published").length;
    const failed = results.filter((r) => r.status === "error").length;

    return apiResponse({
      success: true,
      message: `Published ${published} blog(s)`,
      published,
      failed,
      results,
    });
  } catch (error) {
    console.error("Scheduled publishing cron error:", error);
    return apiResponse(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/*
 * Setup automated publishing using one of these methods:
 * 
 * 1. Vercel Cron (recommended for Vercel deployments)
 *    Add to vercel.json:
 *    { "crons": [{ "path": "/api/cron/publish-scheduled-blogs", "schedule": "every 5 minutes" }] }
 * 
 * 2. GitHub Actions (for self-hosted)
 *    Create .github/workflows/publish-blogs.yml with schedule: "every 5 minutes"
 * 
 * 3. External Cron Service (e.g., EasyCron, cron-job.org)
 *    URL: https://yourdomain.com/api/cron/publish-scheduled-blogs
 *    Header: Authorization: Bearer YOUR_CRON_SECRET
 *    Schedule: Every 5 minutes
 * 
 * 4. Node-cron (for local development/testing)
 *    cron.schedule('every 5 minutes', async () => {
 *      await fetch('http://localhost:3000/api/cron/publish-scheduled-blogs', {
 *        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
 *      });
 *    });
 */
