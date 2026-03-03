import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { categoryRepository } from "@/repositories";
import { NotFoundError } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/admin/categories/[id]
export const PATCH = withHandler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser();
  requireCapability(user, "manage_categories");

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

  const category = await categoryRepository.updateById(id, updates);
  if (!category) throw new NotFoundError("Category");

  return NextResponse.json(category);
});

// DELETE /api/admin/categories/[id]
export const DELETE = withHandler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUser();
  requireCapability(user, "manage_categories");

  const { id } = await ctx.params;
  const category = await categoryRepository.deleteById(id);
  if (!category) throw new NotFoundError("Category");

  return NextResponse.json({ success: true });
});
