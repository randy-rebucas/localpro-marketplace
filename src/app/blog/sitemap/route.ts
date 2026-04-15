/**
 * Blog Sitemap
 * 
 * Generates XML sitemap for blog articles for search engine indexing
 * Accessible at /blog/sitemap.xml
 */

import { blogRepository } from "@/repositories";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.localpro.asia";

/**
 * GET /blog/sitemap.xml
 * 
 * Returns XML sitemap of published blogs
 */
export async function GET() {
  try {
    // Fetch all published blogs (get first batch, then iterate)
    const result = await blogRepository.findPublished(1, 1000);
    const blogs = result.blogs || [];

    // Generate sitemap entries
    const sitemapEntries = blogs
      .map((blog) => {
        const lastmod = new Date(blog.updatedAt || blog.publishedAt || new Date()).toISOString().split("T")[0];
        return `
  <url>
    <loc>${SITE_URL}/blog/${blog.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      })
      .join("");

    // Add main blog page
    const blogPageEntry = `
  <url>
    <loc>${SITE_URL}/blog</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${blogPageEntry}
${sitemapEntries}
</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);

    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/blog</loc>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(errorXml, {
      status: 500,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  }
}
