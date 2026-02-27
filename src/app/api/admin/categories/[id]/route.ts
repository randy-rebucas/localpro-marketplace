import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser, requireRole } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/admin/categories/[id]
export const PATCH = withHandler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser();
  requireRole(user, "admin");
  await connectDB();

  const { id } = await ctx.params;
  const updates = await req.json();

  // Rebuild slug if name changes
  if (updates.name) {
    updates.slug = updates.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    updates.name = updates.name.trim();
  }

  const category = await Category.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json(category);
});

// DELETE /api/admin/categories/[id]
export const DELETE = withHandler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUser();
  requireRole(user, "admin");
  await connectDB();

  const { id } = await ctx.params;
  const category = await Category.findByIdAndDelete(id).lean();
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
});
