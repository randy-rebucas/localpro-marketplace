import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Category, { DEFAULT_CATEGORIES } from "@/models/Category";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();

  // Seed on first call if collection is empty
  const count = await Category.countDocuments();
  if (count === 0) {
    const docs = DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      slug: c.name.toLowerCase().replace(/\s+/g, "-"),
    }));
    await Category.insertMany(docs);
  }

  const categories = await Category.find({ isActive: true })
    .sort({ order: 1, name: 1 })
    .select("_id name slug icon order")
    .lean();

  return NextResponse.json(categories);
}
