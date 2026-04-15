import { IBlog, PopulatedAuthor } from "@/models/Blog";
import { Types } from "mongoose";

/**
 * Generate JSON-LD schema markup for a blog article
 * Provides structured data for search engines
 */
export function generateBlogArticleSchema(blog: IBlog, siteUrl: string) {
  const author = blog.author as PopulatedAuthor;
  const authorId =
    typeof author === "object" ? author._id : blog.author;
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${siteUrl}/blog/${blog.slug}#article`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/blog/${blog.slug}`,
    },
    headline: blog.title,
    description: blog.metaDescription || blog.excerpt,
    image: blog.featuredImage
      ? {
          "@type": "ImageObject",
          url: blog.featuredImage,
          width: 1200,
          height: 630,
        }
      : undefined,
    datePublished: blog.publishedAt
      ? new Date(blog.publishedAt).toISOString()
      : new Date(blog.createdAt || Date.now()).toISOString(),
    dateModified: blog.updatedAt
      ? new Date(blog.updatedAt).toISOString()
      : new Date(blog.publishedAt || blog.createdAt || Date.now()).toISOString(),
    author: {
      "@type": "Person",
      name: typeof author === "object" ? author.name : "LocalPro",
      email: typeof author === "object" ? author.email : undefined,
      url: typeof author === "object" ? `${siteUrl}/providers/${authorId}` : undefined,
    },
    publisher: {
      "@type": "Organization",
      name: "LocalPro",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.png`,
      },
    },
    articleBody: blog.content,
    keywords: blog.keywords?.join(","),
    articleSection: blog.category,
    inLanguage: "en-US",
  };

  // Remove undefined fields
  return JSON.parse(JSON.stringify(schema));
}

/**
 * Generate JSON-LD schema for blog listing page
 */
export function generateBlogCollectionSchema(
  blogs: IBlog[],
  category: string | undefined,
  siteUrl: string
) {
  const items = blogs.slice(0, 10).map((blog) => ({
    "@type": "BlogPosting",
    headline: blog.title,
    url: `${siteUrl}/blog/${blog.slug}`,
    datePublished: blog.publishedAt?.toISOString() || blog.createdAt?.toISOString(),
    image: blog.featuredImage,
  }));

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category ? `${category} - LocalPro Blog` : "LocalPro Blog",
    description: "LocalPro blog articles and insights",
    url: category ? `${siteUrl}/blog/category/${category}` : `${siteUrl}/blog`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: item.url,
      })),
    },
  };

  return JSON.parse(JSON.stringify(schema));
}

/**
 * Generate FAQPage schema for blog articles with common Q&A
 * Helps create featured snippets in search results
 */
export function generateBlogFAQSchema(
  faqs: Array<{ question: string; answer: string }>,
  siteUrl: string,
  pageTitle: string
) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return JSON.parse(JSON.stringify(schema));
}
