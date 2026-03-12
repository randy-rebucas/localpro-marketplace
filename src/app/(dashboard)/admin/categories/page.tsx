import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import CategoriesManager from "./CategoriesManager";
import type { ICategory } from "@/types";
import PageGuide from "@/components/shared/PageGuide";
import { Tags } from "lucide-react";

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
    <div className="space-y-5">
      <PageGuide
        pageKey="admin-categories"
        title="How Categories works"
        steps={[
          { icon: "🏷️", title: "Service categories", description: "Categories appear in the job posting form and marketplace filters. Keep them clear and specific." },
          { icon: "➕", title: "Add new categories", description: "Click 'Add Category' to create a new service type. It becomes immediately available to clients and providers." },
          { icon: "✏️", title: "Edit & reorder", description: "Rename categories or drag to reorder them. Display order affects how they appear in dropdowns and filters." },
          { icon: "🗑️", title: "Deactivate unused", description: "Deactivated categories are hidden from new listings but preserved in existing job records." },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
          <Tags className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Categories</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage service categories shown to clients and providers</p>
        </div>
      </div>

      <CategoriesManager initialCategories={categories} />
    </div>
  );
}
