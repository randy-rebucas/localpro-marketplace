import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import CategoriesManager from "./CategoriesManager";
import type { ICategory } from "@/types";
import PageGuide from "@/components/shared/PageGuide";

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
