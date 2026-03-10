import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/login",
          "/register",
          "/forgot-password",
          "/privacy",
          "/terms",
          "/board",
          "/jobs/",
          "/api/og",
        ],
        disallow: [
          "/client/",
          "/provider/",
          "/admin/",
          "/api/",
          "/verify-email",
          "/reset-password",
          "/offline",
          "/push",
        ],
      },
      // Allow Google to crawl JS/CSS for better rendering
      {
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: ["/api/", "/client/", "/provider/", "/admin/"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
