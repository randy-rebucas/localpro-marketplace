import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { categoryRepository } from "@/repositories/category.repository";
import PostJobClient from "./_components/PostJobClient";
import type { ICategory } from "@/types";
import type { CategoryDocument } from "@/models/Category";

export default async function PostJobPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { category: categoryParam } = await searchParams;

  const rawCategories = await categoryRepository.findActive();

  const categories: ICategory[] = (rawCategories as CategoryDocument[]).map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
    isActive: c.isActive,
    order: c.order,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  // Resolve the initial category name from the query param (case-insensitive)
  const initialCategory = categoryParam
    ? (categories.find((c) => c.name.toLowerCase() === categoryParam.toLowerCase())?.name ?? categoryParam)
    : "";

  return <PostJobClient categories={categories} initialCategory={initialCategory} />;
}
