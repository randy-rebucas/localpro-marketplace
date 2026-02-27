import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser, requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";

// GET /api/admin/categories — all categories (active + inactive)
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin");
  await connectDB();

  const categories = await Category.find()
    .sort({ order: 1, name: 1 })
    .lean();

  return NextResponse.json(categories);
});

// POST /api/admin/categories — create a new category
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");
  await connectDB();

  const { name, icon, order } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const existing = await Category.findOne({ $or: [{ name: name.trim() }, { slug }] });
  if (existing) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }

  const maxOrder = await Category.findOne().sort({ order: -1 }).select("order").lean();
  const nextOrder = typeof order === "number" ? order : ((maxOrder as any)?.order ?? -1) + 1;

  const category = await Category.create({
    name: name.trim(),
    slug,
    icon: icon?.trim() || "🔧",
    order: nextOrder,
  });

  return NextResponse.json(category, { status: 201 });
});
