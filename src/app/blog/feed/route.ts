/**
 * Blog RSS Feed
 * 
 * Generates an RSS 2.0 feed of all published blog articles
 * Accessible at /blog/feed or /blog/feed.xml
 */

import { blogRepository } from "@/repositories";

const SITE_NAME = "LocalPro";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.localpro.asia";
const SITE_DESCRIPTION = "Insights, updates, and stories from the LocalPro community";

/**
 * Generate RSS XML feed
 */
function generateRSSFeed(blogs: any[]): string {
  const blogItems = blogs
    .map((blog) => {
      const articleUrl = `${SITE_URL}/blog/${blog.slug}`;
      const publishDate = new Date(blog.publishedAt).toUTCString();

      return `
    <item>
      <title><![CDATA[${blog.title}]]></title>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <description><![CDATA[${blog.excerpt || blog.content?.substring(0, 200) || ""}]]></description>
      <content:encoded><![CDATA[${sanitizeHtml(blog.content)}]]></content:encoded>
      <pubDate>${publishDate}</pubDate>
      <author>${blog.author?.email || "noreply@localpro.asia"}</author>
      ${blog.keywords?.map((tag: string) => `<category>${tag}</category>`).join("") || ""}
      ${blog.featuredImage ? `<image><url>${encodeURI(blog.featuredImage)}</url><title><![CDATA[${blog.title}]]></title><link>${articleUrl}</link></image>` : ""}
    </item>
      `;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title><![CDATA[${SITE_NAME} Blog]]></title>
    <link>${SITE_URL}/blog</link>
    <description><![CDATA[${SITE_DESCRIPTION}]]></description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <docs>http://blogs.law.harvard.edu/tech/rss</docs>
    <generator>LocalPro Blog Engine</generator>
    <image>
      <title>${SITE_NAME}</title>
      <url>${SITE_URL}/logo.png</url>
      <link>${SITE_URL}</link>
    </image>
    ${blogItems}
  </channel>
</rss>`;
}

/**
 * Sanitize HTML for RSS feed
 */
function sanitizeHtml(content: string): string {
  if (!content) return "";
  
  // Convert markdown links to HTML
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Escape special XML characters
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * GET /blog/feed or /blog/feed.xml
 * 
 * Returns RSS 2.0 feed of published blogs
 */
export async function GET() {
  try {
    // Fetch latest 50 published blogs
    const result = await blogRepository.findPublished(1, 50);
    const blogs = result.blogs || [];

    const xml = generateRSSFeed(blogs);

    return new Response(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("RSS feed generation error:", error);

    // Return error RSS
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${SITE_NAME} Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Error loading feed</description>
  </channel>
</rss>`;

    return new Response(errorXml, {
      status: 500,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
      },
    });
  }
}
