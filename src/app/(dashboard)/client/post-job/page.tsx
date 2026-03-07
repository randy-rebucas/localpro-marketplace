import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { categoryRepository } from "@/repositories/category.repository";
import PostJobClient from "./_components/PostJobClient";
import type { ICategory } from "@/types";
import type { CategoryDocument } from "@/models/Category";
import type { FormData } from "./_components/types";

export default async function PostJobPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    title?: string;
    description?: string;
    budget?: string;
    location?: string;
    specialInstructions?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { category: categoryParam, title, description, budget, location, specialInstructions } = await searchParams;

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

  // Resolve category name (case-insensitive)
  const resolvedCategory = categoryParam
    ? (categories.find((c) => c.name.toLowerCase() === categoryParam.toLowerCase())?.name ?? categoryParam)
    : "";

  const initialData: Partial<FormData> = {
    ...(resolvedCategory          && { category: resolvedCategory }),
    ...(title                     && { title }),
    ...(description               && { description }),
    ...(budget                    && { budget }),
    ...(location                  && { location }),
    ...(specialInstructions       && { specialInstructions }),
  };

  return <PostJobClient categories={categories} initialData={initialData} />;
}
