import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getArticle } from "@/lib/knowledge";
import ArticleView from "@/components/shared/ArticleView";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = getArticle("provider", id);
  return { title: article?.title ?? "Article" };
}

export default async function ProviderArticlePage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const article = getArticle("provider", id);
  if (!article) notFound();

  return (
    <ArticleView
      article={{
        _id:         article.slug,
        title:       article.title,
        excerpt:     article.excerpt,
        contentHtml: article.contentHtml,
        group:       article.group,
        updatedAt:   article.updatedAt,
      }}
      backHref="/provider/knowledge"
    />
  );
}
