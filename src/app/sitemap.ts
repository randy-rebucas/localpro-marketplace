import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import User from "@/models/User";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Fetch public open/completed job IDs and approved provider profile IDs
  let jobEntries: MetadataRoute.Sitemap = [];
  let providerEntries: MetadataRoute.Sitemap = [];
  try {
    await connectDB();
    const [jobs, providers] = await Promise.all([
      Job.find({ status: { $in: ["open", "completed"] } })
        .sort({ updatedAt: -1 })
        .limit(500)
        .select("_id updatedAt")
        .lean(),
      User.find({ role: "provider", approvalStatus: "approved", isDeleted: { $ne: true } })
        .sort({ updatedAt: -1 })
        .limit(1000)
        .select("_id updatedAt")
        .lean(),
    ]);
    jobEntries = jobs.map((j) => ({
      url: `${APP_URL}/jobs/${j._id}`,
      lastModified: (j as unknown as { updatedAt: Date }).updatedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
    providerEntries = providers.map((p) => ({
      url: `${APP_URL}/providers/${p._id}`,
      lastModified: (p as unknown as { updatedAt: Date }).updatedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // silently skip dynamic entries if DB unavailable during build
  }

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${APP_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${APP_URL}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${APP_URL}/register?role=client`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${APP_URL}/register?role=provider`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${APP_URL}/board`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${APP_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/provider-agreement`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/client-agreement`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/escrow-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/refund-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/dispute-resolution`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/jobs`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${APP_URL}/providers`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${APP_URL}/peso-program`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${APP_URL}/refer`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  return [...staticPages, ...jobEntries, ...providerEntries];
}
