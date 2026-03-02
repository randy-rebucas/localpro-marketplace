import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getArticle } from "@/lib/knowledge";
import ArticleView from "@/components/shared/ArticleView";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = getArticle("client", id);
  return { title: article?.title ?? "Article" };
}

export default async function ClientArticlePage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const article = getArticle("client", id);
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
      backHref="/client/knowledge"
    />
  );
}
