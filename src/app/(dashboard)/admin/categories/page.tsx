import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import CategoriesManager from "./CategoriesManager";
import type { ICategory } from "@/types";

export const metadata: Metadata = { title: "Categories" };


export default async function AdminCategoriesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectDB();

  const categories = JSON.parse(
    JSON.stringify(
      await Category.find().sort({ order: 1, name: 1 }).lean()
    )
  ) as ICategory[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Categories</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Manage service categories shown to clients and providers
        </p>
      </div>
      <CategoriesManager initialCategories={categories} />
    </div>
  );
}
