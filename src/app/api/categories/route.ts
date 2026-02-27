import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Category, { DEFAULT_CATEGORIES } from "@/models/Category";
import { unstable_cache } from "next/cache";

// Categories change rarely — cache the response for 24 hours
export const revalidate = 86400;

const getCachedCategories = unstable_cache(
  async () => {
    await connectDB();
    const count = await Category.countDocuments();
    if (count === 0) {
      const docs = DEFAULT_CATEGORIES.map((c) => ({
        ...c,
        slug: c.name.toLowerCase().replace(/\s+/g, "-"),
      }));
      await Category.insertMany(docs);
    }
    return Category.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .select("_id name slug icon order")
      .lean();
  },
  ["categories"],
  { revalidate: 86400, tags: ["categories"] }
);

export async function GET() {
  const categories = await getCachedCategories();
  return NextResponse.json(categories);
}
